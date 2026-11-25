/*
 * SMART OFFICE - Firmware ESP32 cho mô phỏng Wokwi (giao tiếp qua MQTT)
 *
 * App (Expo Go / web) <--wss--> broker.hivemq.com <--tcp--> ESP32 (Wokwi)
 *
 * Topic (BASE = smartoffice/so-8f3k2q, phải trùng với app):
 *   BASE/cmd/<id>    app -> ESP32   {"on":true} {"brightness":80} {"speed":2} {"locked":true} {"position":60}
 *   BASE/cmd/buzzer  app -> ESP32   {"on":true,"seconds":5}   (còi báo động)
 *   BASE/sensors     ESP32 -> app   {"temperature","humidity","gas","light","co2","motion","fridgeOpen"}
 *   BASE/state/<id>  ESP32 -> app   trạng thái do mạch tự đổi: {"locked":false} (quẹt thẻ), {"doorOpen":true} (cửa tủ)
 *   BASE/rfid        ESP32 -> app   {"uid":"3A:7F:22:91","granted":true}
 *                    granted = mạch đã tự mở cửa. Thẻ Khách/thẻ lạ gửi granted=false, app kiểm tra
 *                    quyền + khung giờ (Khách 08:00-18:00) rồi mới gửi lệnh cmd/d10 {"locked":false}.
 *   BASE/status      ESP32 -> app   "online Wokwi-ESP32" / "offline" (retain, LWT)
 *
 * Wokwi không có module RC522 nên dùng nút "Quet the" (GPIO32): mỗi lần bấm giả lập quẹt
 * lần lượt 1 thẻ trong danh sách (4 thẻ nhân viên + 1 thẻ lạ).
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>

// ====== MẠNG ======
const char* WIFI_SSID = "Wokwi-GUEST";  // Wi-Fi ảo của Wokwi, có Internet
const char* WIFI_PASS = "";
const char* MQTT_HOST = "broker.hivemq.com";
const int   MQTT_PORT = 1883;
const String BASE = "smartoffice/so-8f3k2q";

// ====== CHÂN CẢM BIẾN / NÚT ======
#define DHT_PIN     4
#define GAS_PIN     34   // Biến trở giả lập cảm biến khí gas MQ-2
#define LDR_PIN     35   // Cảm biến ánh sáng (quang trở)
#define CO2_PIN     36   // (VP) Biến trở giả lập cảm biến CO2 MH-Z19
#define PIR_PIN     33   // Cảm biến chuyển động
#define BUZZER_PIN  15
#define RFID_BTN    32   // Nút giả lập quẹt thẻ RFID
#define FRIDGE_SW   39   // (VN) Công tắc gạt giả lập reed switch cửa tủ đông

// ====== THẺ RFID ======
// allowed = true: mạch tự mở cửa ngay (Quản trị viên, Nhân viên - chạy được cả khi mất mạng).
// allowed = false: chỉ báo lên app; app quyết định (thẻ Khách giới hạn 08:00-18:00, thẻ lạ bị từ chối).
struct Card { const char* uid; const char* name; bool allowed; };
Card cards[] = {
  { "3A:7F:22:91", "Quan tri vien", true },
  { "9C:12:AB:04", "Tran Thi Binh", true },
  { "51:EE:30:7D", "Le Hoang Cuong", true },
  { "06:4B:C9:18", "Pham Minh Dung", false },  // Khách
  { "DE:AD:BE:EF", "The la",        false },
};
const int CARD_COUNT = sizeof(cards) / sizeof(cards[0]);
int nextCard = 0;
const unsigned long RFID_OPEN_MS = 5000;  // quẹt thẻ hợp lệ: mở cửa chính 5 giây

// ====== THIẾT BỊ (id trùng với app) ======
enum Kind { ONOFF, DIMMER, FAN, LOCK_SERVO, LOCK_LED, CURTAIN };

struct Device {
  const char* id;
  const char* name;  // tên ngắn hiển thị trên LCD (không dấu)
  Kind kind;
  int pin;
  bool on;
  int level;  // độ sáng 0-100, tốc độ quạt 1-3, vị trí rèm 0-100
};

Device devices[] = {
  { "d1",  "Den tran",     DIMMER,     16, true,  80 },
  { "d2",  "Den ban",      ONOFF,      17, false, 0  },
  { "d3",  "Den phong hop",ONOFF,      18, true,  0  },
  { "d4",  "Den sanh",     ONOFF,      19, true,  0  },
  { "d5",  "Quat tran",    FAN,         2, true,  2  },
  { "d6",  "Quat dung",    FAN,         5, false, 1  },
  { "d7",  "Dieu hoa hop", ONOFF,      23, false, 0  },
  { "d8",  "Dieu hoa GD",  ONOFF,      25, true,  0  },
  { "d9",  "Tu dong lanh", ONOFF,      26, true,  0  },
  { "d10", "Cua chinh",    LOCK_SERVO, 13, true,  0  },  // on = đã khóa
  { "d11", "Cua GD",       LOCK_LED,   27, false, 0  },  // LED sáng = đã khóa
  { "d12", "Rem hop",      CURTAIN,    14, true,  60 },
};
const int N = sizeof(devices) / sizeof(devices[0]);

WiFiClient net;
PubSubClient mqtt(net);
DHT dht(DHT_PIN, DHT22);
Servo doorServo, curtainServo;
LiquidCrystal_I2C lcd(0x27, 16, 2);

String lastMsg = "";
unsigned long lastMsgAt = 0, lastPub = 0, lastLcd = 0;
unsigned long relockAt = 0;      // thời điểm tự khóa lại cửa chính sau khi quẹt thẻ
unsigned long buzzerUntil = 0;   // còi báo động theo lệnh app
float temp = 0, hum = 0;
int gas = 0, lux = 0, co2 = 400;
bool motion = false;
bool fridgeOpen = false;
String line1Old, line2Old;  // nội dung LCD đang hiển thị

// ---------- Điều khiển phần cứng ----------
void apply(Device& d) {
  switch (d.kind) {
    case ONOFF:
      digitalWrite(d.pin, d.on ? HIGH : LOW);
      break;
    case DIMMER:
      analogWrite(d.pin, d.on ? map(d.level, 0, 100, 0, 255) : 0);
      break;
    case FAN: {
      const int duty[] = { 0, 70, 160, 255 };
      analogWrite(d.pin, d.on ? duty[constrain(d.level, 1, 3)] : 0);
      break;
    }
    case LOCK_SERVO:
      doorServo.write(d.on ? 0 : 90);  // 0° = chốt khóa, 90° = mở
      break;
    case LOCK_LED:
      digitalWrite(d.pin, d.on ? HIGH : LOW);
      break;
    case CURTAIN:
      curtainServo.write(d.on ? map(d.level, 0, 100, 0, 180) : 0);
      break;
  }
}

Device* findDevice(const String& id) {
  for (int i = 0; i < N; i++) if (id == devices[i].id) return &devices[i];
  return nullptr;
}

void showMsg(const String& s) {
  lastMsg = s;
  lastMsgAt = millis();
  lastLcd = 0;  // vẽ lại LCD ngay
}

// Báo trạng thái do mạch tự thay đổi lên app
void publishState(const char* id, const char* key, bool value) {
  JsonDocument doc;
  doc[key] = value;
  char buf[48];
  serializeJson(doc, buf);
  mqtt.publish((BASE + "/state/" + id).c_str(), buf);
}

// ---------- MQTT ----------
void onMessage(char* topic, byte* payload, unsigned int len) {
  String t = String(topic);
  String id = t.substring(t.lastIndexOf('/') + 1);

  JsonDocument doc;
  if (deserializeJson(doc, payload, len)) return;

  // Còi báo động theo lệnh từ app (quy tắc tự động, nút Báo động ở camera...)
  if (id == "buzzer") {
    if (doc["on"] | false) {
      int sec = doc["seconds"] | 5;
      buzzerUntil = millis() + sec * 1000UL;
      Serial.printf("[CMD] buzzer -> BAO DONG %ds\n", sec);
      showMsg("!! BAO DONG !!");
    } else {
      buzzerUntil = 0;
    }
    return;
  }

  Device* d = findDevice(id);
  if (!d) return;

  if (doc["on"].is<bool>())        d->on = doc["on"];
  if (doc["locked"].is<bool>())    d->on = doc["locked"];
  if (doc["brightness"].is<int>()) d->level = doc["brightness"];
  if (doc["speed"].is<int>())      d->level = doc["speed"];
  if (doc["position"].is<int>())   d->level = doc["position"];
  apply(*d);
  if (d->kind == LOCK_SERVO) relockAt = 0;  // app điều khiển cửa -> hủy hẹn tự khóa

  String state;
  if (d->kind == LOCK_SERVO || d->kind == LOCK_LED) state = d->on ? "KHOA" : "MO";
  else if (!d->on) state = "TAT";
  else if (d->kind == DIMMER || d->kind == CURTAIN) state = String(d->level) + "%";
  else if (d->kind == FAN) state = "So " + String(d->level);
  else state = "BAT";

  Serial.printf("[CMD] %s (%s) -> %s\n", d->id, d->name, state.c_str());
  showMsg(String(d->name) + ":" + state);
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.println("Mat WiFi, dang ket noi lai...");
  lcd.setCursor(0, 1);
  lcd.print("WiFi: noi lai.. ");
  line2Old = "";
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASS, 6);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) delay(200);
  if (WiFi.status() == WL_CONNECTED) Serial.println("WiFi OK: " + WiFi.localIP().toString());
}

void connectMqtt() {
  int fails = 0;
  while (!mqtt.connected()) {
    ensureWifi();
    lcd.setCursor(0, 1);
    lcd.print("MQTT: dang noi..");
    line2Old = "";  // buộc vẽ lại dòng 2 sau khi kết nối xong
    String cid = "so-wokwi-" + String((uint32_t)esp_random(), HEX);
    String statusTopic = BASE + "/status";
    if (mqtt.connect(cid.c_str(), nullptr, nullptr, statusTopic.c_str(), 0, true, "offline")) {
      mqtt.publish(statusTopic.c_str(), "online Wokwi-ESP32", true);
      mqtt.subscribe((BASE + "/cmd/#").c_str());
      Serial.println("MQTT da ket noi: " + String(MQTT_HOST));
      showMsg("MQTT: OK");
    } else {
      Serial.printf("MQTT loi %d, thu lai...\n", mqtt.state());
      // Lỗi liên tiếp -> có thể mất mạng, ép kết nối lại Wi-Fi
      if (++fails >= 3) { WiFi.disconnect(); fails = 0; }
      delay(2000);
    }
  }
}

// ---------- RFID ----------
void scanCard(const Card& c) {
  Device* door = findDevice("d10");
  Serial.printf("[RFID] %s (%s) -> %s\n", c.uid, c.name, c.allowed ? "MO CUA" : "GUI APP KIEM TRA");
  if (c.allowed && door) {
    door->on = false;  // mở khóa
    apply(*door);
    relockAt = millis() + RFID_OPEN_MS;
    publishState("d10", "locked", false);
    tone(BUZZER_PIN, 2000, 120);  // bíp ngắn: chấp nhận
    showMsg(String("Moi vao: ") + c.name);
  } else {
    tone(BUZZER_PIN, 1200, 60);   // bíp nhẹ: chờ app xác nhận (app gửi lệnh mở nếu đủ quyền)
    showMsg("Cho app xac nhan");
  }
  JsonDocument doc;
  doc["uid"] = c.uid;
  doc["granted"] = c.allowed;
  char buf[80];
  serializeJson(doc, buf);
  mqtt.publish((BASE + "/rfid").c_str(), buf);
}

void checkRfidButton() {
  static bool lastBtn = HIGH;
  static unsigned long lastChange = 0;
  bool b = digitalRead(RFID_BTN);
  if (b != lastBtn && millis() - lastChange > 50) {  // chống dội phím
    lastChange = millis();
    lastBtn = b;
    if (b == LOW) {
      scanCard(cards[nextCard]);
      nextCard = (nextCard + 1) % CARD_COUNT;
    }
  }
  // Hết 5 giây -> tự khóa lại cửa chính
  if (relockAt && millis() > relockAt) {
    relockAt = 0;
    Device* door = findDevice("d10");
    if (door) {
      door->on = true;
      apply(*door);
      publishState("d10", "locked", true);
      showMsg("Cua chinh: KHOA");
    }
  }
}

void checkFridgeDoor() {
  bool open = digitalRead(FRIDGE_SW) == HIGH;  // gạt sang 3V3 = cửa mở
  if (open != fridgeOpen) {
    fridgeOpen = open;
    publishState("d9", "doorOpen", open);
    Serial.printf("[SENSOR] Cua tu dong %s\n", open ? "MO" : "DONG");
    showMsg(open ? "Cua tu: MO" : "Cua tu: DONG");
  }
}

// ---------- Cảm biến ----------
void readSensors() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t)) temp = t;
  if (!isnan(h)) hum = h;
  gas = map(analogRead(GAS_PIN), 0, 4095, 0, 1000);
  co2 = map(analogRead(CO2_PIN), 0, 4095, 400, 2000);
  // Công thức quy đổi lux của module quang trở Wokwi (điều chỉnh cho 3.3V)
  int raw = analogRead(LDR_PIN);
  float v = raw / 4095.0 * 3.3;
  if (v > 0.01 && v < 3.29) {
    float r = 2000 * v / (1 - v / 3.3);
    lux = (int)pow(50 * 1e3 * pow(10, 0.7) / r, 1 / 0.7);
  }
  lux = constrain(lux, 0, 100000);
  motion = digitalRead(PIR_PIN) == HIGH;
}

// Còi: báo động gas tại chỗ (không cần app) hoặc theo lệnh app
void updateBuzzer() {
  static bool sounding = false;
  bool want = gas > 400 || millis() < buzzerUntil;
  if (want && !sounding) tone(BUZZER_PIN, 1000);
  if (!want && sounding) noTone(BUZZER_PIN);
  sounding = want;
}

void publishSensors() {
  JsonDocument doc;
  doc["temperature"] = round(temp * 10) / 10.0;
  doc["humidity"] = round(hum);
  doc["gas"] = gas;
  doc["light"] = lux;
  doc["co2"] = co2;
  doc["motion"] = motion;
  doc["fridgeOpen"] = fridgeOpen;  // gửi kèm để app luôn đồng bộ cửa tủ đông
  char buf[200];
  serializeJson(doc, buf);
  mqtt.publish((BASE + "/sensors").c_str(), buf);
}

void drawLcd() {
  // Chỉ vẽ lại khi nội dung thay đổi (đỡ tốn tài nguyên mô phỏng)
  char l1[17];
  snprintf(l1, sizeof(l1), "%.1fC %d%% G%-4d", temp, (int)hum, gas);
  String line1 = String(l1);
  while (line1.length() < 16) line1 += ' ';
  String line2 = (millis() - lastMsgAt < 4000 && lastMsg.length()) ? lastMsg : String(motion ? "Co nguoi - OK" : "MQTT: OK");
  line2 = line2.substring(0, 16);
  while (line2.length() < 16) line2 += ' ';
  if (line1 != line1Old) { lcd.setCursor(0, 0); lcd.print(line1); line1Old = line1; }
  if (line2 != line2Old) { lcd.setCursor(0, 1); lcd.print(line2); line2Old = line2; }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RFID_BTN, INPUT_PULLUP);
  pinMode(FRIDGE_SW, INPUT);
  dht.begin();
  lcd.init();
  lcd.backlight();
  lcd.print("Smart Office");

  doorServo.attach(13);
  curtainServo.attach(14);
  for (int i = 0; i < N; i++) {
    if (devices[i].kind != LOCK_SERVO && devices[i].kind != CURTAIN) pinMode(devices[i].pin, OUTPUT);
    apply(devices[i]);
  }

  lcd.setCursor(0, 1);
  lcd.print("WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASS, 6);
  while (WiFi.status() != WL_CONNECTED) delay(200);
  Serial.println("WiFi OK: " + WiFi.localIP().toString());

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  // Mô phỏng Wokwi chạy chậm hơn thời gian thực -> keep-alive dài để broker không ngắt kết nối
  mqtt.setKeepAlive(300);
  mqtt.setSocketTimeout(60);
  mqtt.setCallback(onMessage);
  connectMqtt();
  fridgeOpen = digitalRead(FRIDGE_SW) == HIGH;
  publishState("d9", "doorOpen", fridgeOpen);
}

void loop() {
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  checkRfidButton();
  checkFridgeDoor();
  updateBuzzer();

  if (millis() - lastPub > 2000) {
    lastPub = millis();
    readSensors();
    publishSensors();
  }
  if (millis() - lastLcd > 1000) {
    lastLcd = millis();
    drawLcd();
  }
}
