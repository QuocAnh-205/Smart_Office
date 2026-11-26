# Tài liệu API: Smart Office

Hệ thống có 2 kênh giao tiếp giữa app và mạch ESP32. Chọn kênh trong app: **Cá nhân → Kết nối ESP32**.

| Kênh | Dùng khi | Máy chủ | Code phía mạch | Code phía app |
|---|---|---|---|---|
| REST API (HTTP) | Mạch ESP32 thật, điện thoại cùng mạng LAN | Web server chạy ngay trên ESP32 (cổng 80) | `arduino/SmartOffice_ESP32/SmartOffice_ESP32.ino` | `src/services/api.js` |
| MQTT | Mô phỏng Wokwi hoặc điều khiển qua Internet | Broker công cộng `broker.hivemq.com` | `arduino/SmartOffice_Wokwi/sketch.ino` | `src/services/mqtt.js`, `src/context/OfficeContext.js` |

Mã thiết bị dùng chung cho cả 2 kênh:

| id | Thiết bị | Trường điều khiển |
|---|---|---|
| d1 | Đèn trần (dimmer) | `on`, `brightness` (0–100) |
| d2, d3, d4 | Đèn bàn, đèn phòng họp, đèn sảnh | `on` |
| d5, d6 | Quạt trần, quạt đứng | `on`, `speed` (1–3) |
| d7, d8 | Điều hòa phòng họp, điều hòa phòng giám đốc | `on`, `temp`, `mode`, `fanSpeed`, `swing` |
| d9 | Tủ đông lạnh | `on`, `freezerTemp`, `fridgeTemp`, `doorOpen` (chỉ đọc) |
| d10 | Cửa chính (servo) | `locked` |
| d11 | Cửa phòng giám đốc | `locked` |
| d12 | Rèm phòng họp (servo) | `on`, `position` (0–100) |
| buzzer | Còi báo động | `on`, `seconds` |

---

## 1. REST API (HTTP, trên ESP32)

Địa chỉ gốc: `http://<IP của ESP32>` (xem IP trong Serial Monitor, tốc độ 115200). Mọi phản hồi đều là JSON. App đặt thời gian chờ 4 giây cho mỗi yêu cầu.

### GET `/api/status`
Trạng thái mạch và toàn bộ thiết bị. App gọi khi vừa kết nối để đồng bộ trạng thái thật của mạch về app.
```json
{
  "ok": true,
  "name": "SmartOffice-ESP32",
  "lastEvent": 12,
  "devices": [
    { "id": "d1", "on": true, "brightness": 80 },
    { "id": "d10", "locked": true }
  ]
}
```

### GET `/api/sensors`
Đọc cảm biến. App gọi mỗi 5 giây.
```json
{ "temperature": 28.5, "humidity": 65, "gas": 120, "light": 450, "co2": 600, "motion": false, "fridgeOpen": false }
```

### GET `/api/events?since=N`
Các sự kiện quẹt thẻ RFID có số thứ tự lớn hơn `N`.
```json
{ "last": 13, "events": [ { "seq": 13, "type": "rfid", "uid": "3A:7F:22:91", "granted": true } ] }
```
`granted = true` nghĩa là mạch đã tự mở cửa. `granted = false` thì app kiểm tra quyền và khung giờ rồi mới gửi lệnh mở.

### POST `/api/device/{id}`
Điều khiển một thiết bị. Body chỉ cần các trường muốn đổi.
```http
POST /api/device/d1
Content-Type: application/json

{ "on": true, "brightness": 60 }
```
Phản hồi: `{ "ok": true }`

### POST `/api/device/buzzer`
```json
{ "on": true, "seconds": 5 }
```

---

## 2. MQTT (qua broker HiveMQ)

| Thông số | Giá trị |
|---|---|
| Broker (app, WebSocket TLS) | `wss://broker.hivemq.com:8884/mqtt` |
| Broker (ESP32, TCP) | `broker.hivemq.com:1883` |
| Topic gốc `BASE` | `smartoffice/so-8f3k2q` (phải trùng ở app và `sketch.ino`) |
| QoS | 0 |

| Topic | Chiều | Payload | Ghi chú |
|---|---|---|---|
| `BASE/cmd/<id>` | app → mạch | `{"on":true}`, `{"brightness":80}`, `{"speed":2}`, `{"locked":false}`, `{"position":60}` | Lệnh điều khiển |
| `BASE/cmd/buzzer` | app → mạch | `{"on":true,"seconds":5}` | Kêu còi báo động |
| `BASE/sensors` | mạch → app | `{"temperature","humidity","gas","light","co2","motion","fridgeOpen"}` | Mạch gửi mỗi 2 giây |
| `BASE/state/<id>` | mạch → app | `{"locked":false}`, `{"doorOpen":true}` | Trạng thái do mạch tự đổi (quẹt thẻ, công tắc cửa tủ) |
| `BASE/rfid` | mạch → app | `{"uid":"3A:7F:22:91","granted":true}` | Sự kiện quẹt thẻ |
| `BASE/status` | mạch → app | `online Wokwi-ESP32` / `offline` | Retain, đồng thời là LWT (di chúc khi mất kết nối) |

Quy tắc phía app:
- App chỉ báo **Đã kết nối** khi broker đã chấp nhận kết nối **và** mạch đang online (nhận `status: online` hoặc gói `sensors`). Mạch im lặng quá 20 giây thì app báo mất kết nối.
- Khi mạch online, app gửi toàn bộ trạng thái thiết bị xuống mạch. Các gói được gửi cách nhau 80ms, và nhiều yêu cầu đồng bộ sát nhau được gộp thành 1 lần.
- Quá 10 giây chưa được broker chấp nhận kết nối thì app tự ngắt và thử lại sau 3 giây.

Thử nhanh bằng công cụ MQTT bất kỳ (ví dụ MQTT Explorer, HiveMQ WebSocket Client):
1. Kết nối `broker.hivemq.com`, subscribe `smartoffice/so-8f3k2q/#` để xem dữ liệu cảm biến.
2. Publish `smartoffice/so-8f3k2q/cmd/d2` với payload `{"on":true}`: đèn bàn trên Wokwi sáng.

> Broker công cộng thì ai biết topic cũng đọc và gửi lệnh được. Chỉ dùng để demo.
