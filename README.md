# Smart Office: ứng dụng văn phòng thông minh (React Native + Expo)

Ứng dụng di động điều khiển văn phòng thông minh dùng Arduino/ESP32. Ứng dụng chạy ngay ở **chế độ mô phỏng**, không cần phần cứng. Khi có ESP32 thì chỉ cần nhập địa chỉ IP là app điều khiển được thiết bị thật.

## Link sản phẩm

| Hạng mục | Link |
|---|---|
| Mã nguồn (GitHub) | https://github.com/QuocAnh-205/Smart_Office |
| Mạch mô phỏng Wokwi | https://wokwi.com/projects/481734543830733825 |
| Tài liệu API (REST + MQTT) | [docs/API.md](docs/API.md) |
| Thiết kế ca kiểm thử | [docs/TEST_CASES.md](docs/TEST_CASES.md) |

## Chạy ứng dụng

```bash
cd SmartOffice
npm install
npx expo start
```

- Điện thoại: cài app **Expo Go**, quét mã QR hiện trên terminal (điện thoại và máy tính phải cùng mạng Wi-Fi).
- Máy ảo Android: nhấn `a` · Trình duyệt web: nhấn `w`.
- Tài khoản demo (mật khẩu **123456**), mỗi vai trò một tài khoản để thử phân quyền:
  - `admin@office.vn`: Quản trị viên (toàn quyền)
  - `nhanvien@office.vn`: Nhân viên (điều khiển, chạy ngữ cảnh, đặt phòng họp, mở cửa khu vực chung)
  - `khach@office.vn`: Khách (chỉ xem; mở cửa khu vực chung trong 08:00–18:00)
- Mã PIN mở cửa mặc định: **1234** (Quản trị viên đổi trong Cài đặt → Bảo mật). Mọi thao tác mở khóa cửa trong app đều phải nhập PIN; sai 3 lần khóa bàn phím 30 giây.

## Danh sách màn hình (38 màn hình)

| Nhóm | Màn hình | File |
|---|---|---|
| Khởi động | Splash, Giới thiệu (onboarding 3 trang) | `src/app/index.js`, `onboarding.js` |
| Xác thực | Đăng nhập, Đăng ký, Quên mật khẩu, Xác thực OTP, Đặt lại mật khẩu | `src/app/(auth)/*` |
| Tab chính | Trang chủ (dashboard), Phòng, Tự động hóa, Thông báo, Cá nhân | `src/app/(tabs)/*` |
| Điều khiển | Đèn, Quạt, Điều hòa, **Tủ đông lạnh**, Khóa cửa, Rèm cửa, Camera | `src/app/device/*` |
| Quản lý | Chi tiết phòng, Thêm phòng, Danh sách thiết bị, Thêm thiết bị | `room/[id].js`, `add-room.js`, `devices.js`, `add-device.js` |
| Tự động | Tạo ngữ cảnh, Tạo quy tắc NẾU/THÌ, Hẹn giờ | `add-scene.js`, `add-automation.js`, `schedule.js` |
| Giám sát | Cảm biến môi trường, Điện năng, Lịch sử hoạt động | `sensors.js`, `energy.js`, `history.js` |
| Văn phòng | Chấm công RFID, Đặt phòng họp, Thành viên | `attendance.js`, `meeting.js`, `members.js` |
| Hệ thống | Cài đặt, Kết nối ESP32, Sửa hồ sơ, Đổi mật khẩu, Trợ giúp, Giới thiệu | `settings.js`, `connection.js`, ... |

## Cấu trúc

```
src/
  app/          # Màn hình (Expo Router, mỗi file là một route)
  components/   # UI dùng chung (ui.js, DeviceTile, DevicePicker, AuthHero)
  context/      # AuthContext (đăng nhập) + OfficeContext (thiết bị, cảm biến, tự động hóa)
  services/     # api.js: gọi REST API của ESP32 và sinh dữ liệu mô phỏng
  data/         # Dữ liệu mẫu
  theme/        # Màu sắc, thông tin loại thiết bị
  utils/        # Phân quyền, quy tắc tự động, thời gian/đơn vị nhiệt độ
arduino/
  SmartOffice_ESP32/   # Firmware ESP32 thật (HTTP REST, RC522, MH-Z19)
  SmartOffice_Wokwi/   # Mạch mô phỏng Wokwi (MQTT): sketch.ino, diagram.json, libraries.txt
```

Dữ liệu (tài khoản, thiết bị, phòng, quy tắc, lịch hẹn giờ, lịch họp, chấm công, thông báo, cài đặt) được lưu bằng AsyncStorage nên vẫn còn sau khi tắt app.

## Bộ xử lý tự động (src/context/OfficeContext.js)

| Chức năng | Cách chạy |
|---|---|
| Quy tắc NẾU/THÌ theo cảm biến (nhiệt độ, độ ẩm, gas, CO₂, ánh sáng, chuyển động) | Chạy khi điều kiện chuyển từ sai sang đúng, tối đa 1 lần/phút, có thể giới hạn theo phòng |
| Quy tắc theo giờ, lịch hẹn giờ bật/tắt | Kiểm tra mỗi 5 giây, chạy đúng 1 lần mỗi phút đã hẹn (lưu lại lần chạy, tải lại app không chạy lặp) |
| Hẹn giờ tắt quạt | Lưu thời điểm kết thúc, hết giờ app gửi lệnh tắt |
| Cửa tủ đông mở quá 60 giây | Cảnh báo nguy hiểm + kêu còi trên mạch |
| Đặt phòng họp | Bật đèn + điều hòa của phòng trước giờ họp 10 phút, tắt khi kết thúc |
| Camera | Có chuyển động ngoài giờ (trước 7:00, sau 18:00) → cảnh báo + tự ghi hình |
| Quẹt thẻ RFID | Chấm công (Vào/Ra, sau 08:05 tính đi muộn) + mở cửa chính 5 giây |

Các bộ hẹn giờ chạy trong app khi app đang mở. Cảnh báo khí gas tại chỗ (còi) do ESP32 tự xử lý nên vẫn hoạt động khi không có app.

Phân quyền được kiểm tra tập trung trong `OfficeContext` / `AuthContext` (`src/utils/permissions.js`), không chỉ ẩn nút trên giao diện.

## Kết nối phần cứng ESP32

1. Mở `arduino/SmartOffice_ESP32/SmartOffice_ESP32.ino` bằng Arduino IDE.
2. Cài thư viện **ArduinoJson** (v7) và **DHT sensor library** (Adafruit), chọn board *ESP32 Dev Module* (core 3.x).
3. Sửa `WIFI_SSID` và `WIFI_PASS`, rồi nạp code. Mở Serial Monitor (115200) để xem IP.
4. Trong app vào **Cá nhân → Kết nối ESP32**, nhập `http://<IP>`, bấm **Kiểm tra**, sau đó **Lưu & dùng**.

Sơ đồ chân mặc định:
Thiết bị: đèn trần d1 → GPIO16 (PWM), đèn bàn d2 → 17, đèn phòng họp d3 → 25, quạt d5 → 26 (PWM), tủ đông d9 → 21, khóa cửa d10 → 22, rèm d12 → 33, còi → 15.
Cảm biến: DHT22 → 4, MQ-2 → 34, quang trở → 35, PIR → 27, MH-Z19 (CO₂, UART2) TX→32 / RX←13, reed switch cửa tủ → 39 (kèm điện trở kéo lên 10k).
RC522 (RFID, SPI): SCK 18, MISO 19, MOSI 23, SDA/SS 5, RST 14. Cần thêm thư viện **MFRC522**.

API:
```
GET  /api/status          -> { name, lastEvent, devices: [{ id, on, brightness, speed, locked, position }] }
GET  /api/sensors         -> { temperature, humidity, gas, light, co2, motion }
GET  /api/events?since=N  -> { last, events: [{ seq, type: "rfid", uid, granted }] }
POST /api/device/:id      body { "on": true, "brightness": 80, "speed": 2, "locked": true, ... }
POST /api/device/buzzer   body { "on": true, "seconds": 5 }
```
Khi mở app hoặc đổi địa chỉ, app gọi `/api/status` để lấy trạng thái thật của mạch; mỗi 5 giây đọc cảm biến và sự kiện quẹt thẻ.

> Lưu ý: tủ đông, quạt và đèn 220V phải đóng ngắt qua relay/SSR có cách ly. Không nối trực tiếp điện lưới vào ESP32.

## Chạy thử với mô phỏng Wokwi (không cần phần cứng thật)

Wokwi trên web không cho điện thoại kết nối thẳng vào ESP32 ảo, nên app và mạch nói chuyện qua **MQTT** (broker công cộng HiveMQ):

```
App (Expo Go / web) --wss:8884--> broker.hivemq.com <--tcp:1883-- ESP32 trên Wokwi
```

1. Vào https://wokwi.com/projects/new/esp32 và chép 3 file trong `arduino/SmartOffice_Wokwi/` (`sketch.ino`, `diagram.json`, `libraries.txt`) vào project.
2. Bấm ▶. Đợi Serial in ra `MQTT da ket noi` (LCD hiện `MQTT: OK`).
3. Trong app vào **Cá nhân → Kết nối ESP32 → chọn MQTT**. Topic mặc định `smartoffice/so-8f3k2q` phải trùng với `BASE` trong `sketch.ino`.
4. Bật/tắt thiết bị trong app: LED, servo cửa/rèm trên Wokwi đổi theo. Bấm vào DHT22 hoặc biến trở gas/CO₂ trên Wokwi để đổi giá trị, app cập nhật theo.
5. Nút xanh **Quet the RFID**: mỗi lần bấm giả lập quẹt lần lượt 4 thẻ nhân viên rồi 1 thẻ lạ. Thẻ hợp lệ mở servo cửa chính 5 giây, app ghi chấm công; thẻ lạ bị từ chối, app cảnh báo.
6. Công tắc gạt **Cua tu dong**: giả lập cảm biến cửa tủ đông; để mở quá 60 giây app sẽ cảnh báo.

Topic MQTT: `cmd/<id>` (app → mạch, có `cmd/buzzer` để kêu còi), `sensors`, `state/<id>` (mạch tự đổi trạng thái: quẹt thẻ, cửa tủ), `rfid`, `status`.

Sơ đồ chân trên Wokwi: đèn d1–d4 → GPIO 16/17/18/19, quạt d5/d6 → 2/5, điều hòa d7/d8 → 23/25, tủ đông d9 → 26, khóa cửa GĐ d11 → 27 (LED đỏ), servo cửa chính d10 → 13, servo rèm d12 → 14, DHT22 → 4, gas → 34, quang trở → 35, PIR → 33, còi → 15, biến trở CO₂ → 36 (VP), nút quẹt thẻ → 32, công tắc cửa tủ → 39 (VN), LCD I2C → SDA 21 / SCL 22.

> Broker công cộng thì ai cũng xem được. Chỉ dùng để demo, và nên đổi topic thành chuỗi riêng của bạn (sửa ở cả app lẫn firmware).
