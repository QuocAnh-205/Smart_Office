/*
 * SMART OFFICE - Firmware ESP32 (phần cứng thật)
 * Giao tiếp với app React Native qua HTTP REST (cùng mạng Wi-Fi).
 *
 *   GET  /api/status          -> {"ok":true,"name":..,"ip":..,"lastEvent":N,
 *                                 "devices":[{"id":"d1","on":true,"brightness":80},{"id":"d10","locked":true},...]}
 *                                 (app gọi khi mới kết nối để lấy trạng thái thật của mạch)
 *   GET  /api/sensors         -> {"temperature","humidity","gas","light","co2","motion","fridgeOpen"}
 *   GET  /api/events?since=N  -> {"last":M,"events":[{"seq":..,"type":"rfid","uid":"3A:7F:22:91","granted":true}]}
 *   POST /api/device/<id>     body JSON: {"on":true} | {"brightness":80} | {"speed":2} | {"locked":true} | {"position":60}
 *   POST /api/device/buzzer   body JSON: {"on":true,"seconds":5}   (còi báo động)
 *
 * Thư viện cần cài (Arduino IDE > Library Manager):
 *   - ArduinoJson (Benoit Blanchon) v7
 *   - DHT sensor library (Adafruit) + Adafruit Unified Sensor
 *   - MFRC522 (GithubCommunity / miguelbalboa)
 * Board: ESP32 Dev Module (ESP32 Arduino core 3.x)
 *
 * Sơ đồ chân:
 *   RC522 (SPI): SCK 18, MISO 19, MOSI 23, SDA/SS 5, RST 14, 3.3V
 *   MH-Z19 (UART2): TX cảm biến -> GPIO32, RX cảm biến <- GPIO13, nguồn 5V
 *   Reed switch cửa tủ đông: GPIO39 + điện trở kéo lên 10k ra 3.3V (đóng cửa = LOW)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <SPI.h>
#include <MFRC522.h>

// ====== CẤU HÌNH WI-FI ======
const char* WIFI_SSID = "TEN_WIFI";
const char* WIFI_PASS = "MAT_KHAU_WIFI";

// ====== CHÂN CẢM BIẾN ======
#define DHT_PIN    4     // DHT22: nhiệt độ, độ ẩm
#define DHT_TYPE   DHT22
#define MQ2_PIN    34    // MQ-2 (ngõ ra analog): khí gas
#define LDR_PIN    35    // Quang trở / cảm biến ánh sáng (analog)
#define PIR_PIN    27    // PIR HC-SR501: chuyển động
#define BUZZER_PIN 15    // Còi báo động
#define FRIDGE_SW  39    // Reed switch cửa tủ đông (cần điện trở kéo lên ngoài)
#define RC522_SS   5
#define RC522_RST  14
#define MHZ_RX     32    // ESP32 nhận <- TX của MH-Z19
#define MHZ_TX     13    // ESP32 gửi  -> RX của MH-Z19

// ====== THẺ RFID ĐƯỢC PHÉP (mở cửa ngay cả khi không có app) ======
// Chỉ thẻ Quản trị viên / Nhân viên. Thẻ Khách và thẻ lạ chỉ báo lên app (granted=false);
// app kiểm tra vai trò + khung giờ (Khách 08:00-18:00) rồi mới gửi lệnh mở cửa xuống mạch.
const char* ALLOWED_CARDS[] = { "3A:7F:22:91", "9C:12:AB:04", "51:EE:30:7D" };
const int ALLOWED_COUNT = sizeof(ALLOWED_CARDS) / sizeof(ALLOWED_CARDS[0]);
const unsigned long RFID_OPEN_MS = 5000;

// ====== THIẾT BỊ ======
// id phải trùng với id trong app (src/data/mock.js)
enum Kind { RELAY, PWM_LIGHT, FAN3, LOCK, CURTAIN };

struct Device {
  const char* id;
  Kind kind;
  int pin;       // chân chính (relay / PWM)
  bool on;       // với LOCK: true = đã khóa
  int level;     // độ sáng 0-100, tốc độ quạt 1-3, vị trí rèm 0-100
};

Device devices[] = {
  { "d1",  PWM_LIGHT, 16, false, 80 },  // Đèn trần chính (MOSFET, PWM)
  { "d2",  RELAY,     17, false, 0  },  // Đèn bàn làm việc
  { "d3",  RELAY,     25, false, 0  },  // Đèn phòng họp
  { "d5",  FAN3,      26, false, 1  },  // Quạt trần (PWM qua driver / triac)
  { "d9",  RELAY,     21, true,  0  },  // Tủ đông lạnh (relay nguồn)
  { "d10", LOCK,      22, true,  0  },  // Khóa cửa chính (relay khóa điện từ)
  { "d12", CURTAIN,   33, false, 0  },  // Rèm (relay động cơ, mở khi position > 0)
};
const int DEVICE_COUNT = sizeof(devices) / sizeof(devices[0]);

// Relay của đa số module kích mức THẤP
const bool RELAY_ACTIVE_LOW = true;

WebServer server(80);
DHT dht(DHT_PIN, DHT_TYPE);
MFRC522 rfid(RC522_SS, RC522_RST);
HardwareSerial mhz(2);

float lastTemp = 0, lastHum = 0;
int lastCo2 = 400;
unsigned long lastRead = 0, lastCo2Read = 0;
unsigned long relockAt = 0, buzzerUntil = 0;
bool fridgeOpen = false;

// ---------- Hàng đợi sự kiện (app đọc qua /api/events) ----------
struct Event { unsigned long seq; String uid; bool granted; };
const int EVENT_MAX = 10;
Event events[EVENT_MAX];
unsigned long eventSeq = 0;

void pushEvent(const String& uid, bool granted) {
  eventSeq++;
  events[eventSeq % EVENT_MAX] = { eventSeq, uid, granted };
}

// ---------- Điều khiển phần cứng ----------
void writeRelay(int pin, bool on) {
  digitalWrite(pin, (on ^ RELAY_ACTIVE_LOW) ? HIGH : LOW);
}

void applyDevice(Device& d) {
  switch (d.kind) {
    case RELAY:
      writeRelay(d.pin, d.on);
      break;
    case PWM_LIGHT:
      ledcWrite(d.pin, d.on ? map(d.level, 0, 100, 0, 255) : 0);
      break;
    case FAN3: {
      const int duty[] = { 0, 120, 190, 255 };
      ledcWrite(d.pin, d.on ? duty[constrain(d.level, 1, 3)] : 0);
      break;
    }
    case LOCK:
      // on = true nghĩa là ĐÃ KHÓA -> ngắt relay (khóa điện từ hút khi có điện = mở)
      writeRelay(d.pin, !d.on);
      break;
    case CURTAIN:
      writeRelay(d.pin, d.on && d.level > 0);
      break;
  }
}

Device* findDevice(const String& id) {
  for (int i = 0; i < DEVICE_COUNT; i++) {
    if (id == devices[i].id) return &devices[i];
  }
  return nullptr;
}

// Ghi trạng thái theo đúng tên trường của app
void writeState(JsonObject o, const Device& d) {
  o["id"] = d.id;
  switch (d.kind) {
    case LOCK:      o["locked"] = d.on; break;
    case PWM_LIGHT: o["on"] = d.on; o["brightness"] = d.level; break;
    case FAN3:      o["on"] = d.on; o["speed"] = d.level; break;
    case CURTAIN:   o["on"] = d.on; o["position"] = d.level; break;
    default:        o["on"] = d.on; break;
  }
}

// ---------- HTTP ----------
void sendCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void sendJson(int code, JsonDocument& doc) {
  String out;
  serializeJson(doc, out);
  sendCors();
  server.send(code, "application/json", out);
}

void handleStatus() {
  JsonDocument doc;
  doc["ok"] = true;
  doc["name"] = "SmartOffice-ESP32";
  doc["ip"] = WiFi.localIP().toString();
  doc["uptime"] = millis() / 1000;
  doc["lastEvent"] = eventSeq;
  JsonArray arr = doc["devices"].to<JsonArray>();
  for (int i = 0; i < DEVICE_COUNT; i++) writeState(arr.add<JsonObject>(), devices[i]);
  JsonObject fr = arr.add<JsonObject>();  // trạng thái cửa tủ đông (cảm biến)
  fr["id"] = "d9";
  fr["doorOpen"] = fridgeOpen;
  sendJson(200, doc);
}

// Đọc CO2 từ MH-Z19 qua UART (lệnh 0x86)
void readCo2() {
  if (millis() - lastCo2Read < 5000 && lastCo2Read != 0) return;
  lastCo2Read = millis();
  const byte cmd[9] = { 0xFF, 0x01, 0x86, 0, 0, 0, 0, 0, 0x79 };
  while (mhz.available()) mhz.read();
  mhz.write(cmd, 9);
  byte b[9];
  if (mhz.readBytes(b, 9) != 9 || b[0] != 0xFF || b[1] != 0x86) return;
  byte sum = 0;
  for (int i = 1; i < 8; i++) sum += b[i];
  if ((byte)(0xFF - sum + 1) != b[8]) return;  // sai checksum
  lastCo2 = b[2] * 256 + b[3];
}

void readSensors() {
  if (millis() - lastRead < 2000 && lastRead != 0) return;  // DHT22 đọc tối đa 0.5Hz
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t)) lastTemp = t;
  if (!isnan(h)) lastHum = h;
  lastRead = millis();
}

void handleSensors() {
  readSensors();
  JsonDocument doc;
  doc["temperature"] = round(lastTemp * 10) / 10.0;
  doc["humidity"] = round(lastHum);
  doc["gas"] = map(analogRead(MQ2_PIN), 0, 4095, 0, 1000);       // quy đổi gần đúng sang ppm
  doc["light"] = map(analogRead(LDR_PIN), 0, 4095, 1000, 0);     // quy đổi gần đúng sang lux
  doc["co2"] = lastCo2;
  doc["motion"] = digitalRead(PIR_PIN) == HIGH;
  doc["fridgeOpen"] = fridgeOpen;  // app đọc mỗi 5 giây -> đếm thời gian mở cửa tủ đông
  sendJson(200, doc);
}

void handleEvents() {
  unsigned long since = server.hasArg("since") ? strtoul(server.arg("since").c_str(), nullptr, 10) : 0;
  JsonDocument doc;
  doc["last"] = eventSeq;
  JsonArray arr = doc["events"].to<JsonArray>();
  unsigned long from = eventSeq > EVENT_MAX ? eventSeq - EVENT_MAX + 1 : 1;
  if (since + 1 > from) from = since + 1;
  for (unsigned long s = from; s <= eventSeq; s++) {
    const Event& e = events[s % EVENT_MAX];
    JsonObject o = arr.add<JsonObject>();
    o["seq"] = e.seq;
    o["type"] = "rfid";
    o["uid"] = e.uid;
    o["granted"] = e.granted;
  }
  sendJson(200, doc);
}

// POST /api/device/<id>
void handleDevice(const String& id) {
  JsonDocument res;
  JsonDocument body;
  DeserializationError err = deserializeJson(body, server.arg("plain"));
  if (err) {
    res["ok"] = false;
    res["error"] = "bad json";
    sendJson(400, res);
    return;
  }
  if (id == "buzzer") {
    buzzerUntil = (body["on"] | false) ? millis() + (body["seconds"] | 5) * 1000UL : 0;
    res["ok"] = true;
    sendJson(200, res);
    return;
  }
  Device* d = findDevice(id);
  if (!d) {
    // Thiết bị chưa được nối phần cứng: trả 200 để app không báo mất kết nối
    res["ok"] = false;
    res["ignored"] = true;
    res["id"] = id;
    sendJson(200, res);
    return;
  }
  if (body["on"].is<bool>())        d->on = body["on"];
  if (body["locked"].is<bool>())    d->on = body["locked"];        // khóa cửa
  if (body["brightness"].is<int>()) d->level = body["brightness"];
  if (body["speed"].is<int>())      d->level = body["speed"];
  if (body["position"].is<int>())   { d->level = body["position"]; d->on = d->level > 0 || d->on; }
  if (d->kind == LOCK) relockAt = 0;  // app điều khiển cửa -> hủy hẹn tự khóa
  applyDevice(*d);

  Serial.printf("[CMD] %s -> on=%d level=%d\n", d->id, d->on, d->level);
  writeState(res.to<JsonObject>(), *d);  // trả về trạng thái mới theo tên trường của app
  res["ok"] = true;
  sendJson(200, res);
}

void handleNotFound() {
  if (server.method() == HTTP_OPTIONS) {  // preflight CORS (khi chạy app trên web)
    sendCors();
    server.send(204);
    return;
  }
  String uri = server.uri();
  if (server.method() == HTTP_POST && uri.startsWith("/api/device/")) {
    handleDevice(uri.substring(strlen("/api/device/")));
    return;
  }
  JsonDocument doc;
  doc["ok"] = false;
  doc["error"] = "not found";
  sendJson(404, doc);
}

// ---------- RFID ----------
void checkRfid() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;
  String uid;
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (i) uid += ':';
    if (rfid.uid.uidByte[i] < 0x10) uid += '0';
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  rfid.PICC_HaltA();

  bool granted = false;
  for (int i = 0; i < ALLOWED_COUNT; i++) if (uid == ALLOWED_CARDS[i]) granted = true;
  Serial.printf("[RFID] %s -> %s\n", uid.c_str(), granted ? "MO CUA" : "GUI APP KIEM TRA");
  if (granted) {
    Device* door = findDevice("d10");
    if (door) { door->on = false; applyDevice(*door); relockAt = millis() + RFID_OPEN_MS; }
    tone(BUZZER_PIN, 2000, 120);
  } else {
    tone(BUZZER_PIN, 1200, 60);  // chờ app xác nhận
  }
  pushEvent(uid, granted);
}

// ---------- Cảnh báo tại chỗ + tự khóa cửa ----------
void loopLocal() {
  int gas = map(analogRead(MQ2_PIN), 0, 4095, 0, 1000);
  static bool sounding = false;
  bool want = gas > 400 || millis() < buzzerUntil;  // báo gas không cần app
  if (want && !sounding) tone(BUZZER_PIN, 1000);
  if (!want && sounding) noTone(BUZZER_PIN);
  sounding = want;

  if (relockAt && millis() > relockAt) {
    relockAt = 0;
    Device* door = findDevice("d10");
    if (door) { door->on = true; applyDevice(*door); }
  }
  fridgeOpen = digitalRead(FRIDGE_SW) == HIGH;  // reed hở (cửa mở) -> điện trở kéo lên = HIGH
}

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(FRIDGE_SW, INPUT);
  dht.begin();
  SPI.begin();          // SCK 18, MISO 19, MOSI 23
  rfid.PCD_Init();
  mhz.begin(9600, SERIAL_8N1, MHZ_RX, MHZ_TX);
  mhz.setTimeout(200);

  for (int i = 0; i < DEVICE_COUNT; i++) {
    Device& d = devices[i];
    if (d.kind == PWM_LIGHT || d.kind == FAN3) {
      ledcAttach(d.pin, 5000, 8);  // ESP32 core 3.x: tần số 5kHz, 8 bit
    } else {
      pinMode(d.pin, OUTPUT);
    }
    applyDevice(d);
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Dang ket noi Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Da ket noi! Nhap dia chi nay vao app: http://");
  Serial.println(WiFi.localIP());

  server.on("/api/status", HTTP_GET, handleStatus);
  server.on("/api/sensors", HTTP_GET, handleSensors);
  server.on("/api/events", HTTP_GET, handleEvents);
  server.onNotFound(handleNotFound);
  server.begin();
}

void loop() {
  server.handleClient();
  checkRfid();
  readCo2();
  loopLocal();
}
