# Thiết kế ca kiểm thử: Smart Office

## 1. Phạm vi và môi trường

| Mục | Nội dung |
|---|---|
| Đối tượng kiểm thử | App di động Smart Office (Expo/React Native), firmware ESP32 trên Wokwi, kênh MQTT |
| Thiết bị | Điện thoại Android/iOS chạy Expo Go; máy tính chạy `npx expo start` |
| Mạch | Project Wokwi `Smart_Office` (ESP32 + LED, servo, DHT22, biến trở gas/CO₂, PIR, nút RFID, công tắc cửa tủ, LCD) |
| Broker | `wss://broker.hivemq.com:8884/mqtt`, topic `smartoffice/so-8f3k2q` |
| Tài khoản (mật khẩu `123456`) | `admin@office.vn` (Quản trị viên), `nhanvien@office.vn` (Nhân viên), `khach@office.vn` (Khách) |
| Mã PIN cửa | `1234` |
| Kỹ thuật thiết kế | Phân vùng tương đương, giá trị biên, bảng quyết định (phân quyền), kiểm thử chuyển trạng thái (kết nối, khóa PIN) |

Quy ước trạng thái: **Đạt**, **Không đạt**, **Chưa chạy**. Cột "Kết quả thực tế" điền khi chạy kiểm thử.

---

## 2. Xác thực tài khoản (AUTH)

| Mã | Chức năng | Tiền điều kiện | Các bước | Dữ liệu | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|---|
| AUTH-01 | Đăng nhập đúng | Ở màn hình Đăng nhập | Nhập email, mật khẩu → Đăng nhập | `admin@office.vn` / `123456` | Vào Trang chủ, hiển thị tên "Quản trị viên" | | Chưa chạy |
| AUTH-02 | Sai mật khẩu | Như trên | Nhập email đúng, mật khẩu sai | `admin@office.vn` / `654321` | Báo "Mật khẩu không đúng", không vào app | | Chưa chạy |
| AUTH-03 | Email chưa đăng ký | Như trên | Nhập email lạ | `abc@office.vn` / `123456` | Báo "Email chưa được đăng ký" | | Chưa chạy |
| AUTH-04 | Mật khẩu dưới 6 ký tự (biên) | Như trên | Nhập mật khẩu 5 ký tự | `admin@office.vn` / `12345` | Báo "Mật khẩu tối thiểu 6 ký tự" | | Chưa chạy |
| AUTH-05 | Đăng ký mới hợp lệ | Màn hình Đăng ký | Nhập họ tên, email mới, mật khẩu ≥ 6 ký tự → Đăng ký | `Nguyễn Văn A`, `a@office.vn`, `abcdef` | Tạo tài khoản, đăng nhập được bằng tài khoản mới | | Chưa chạy |
| AUTH-06 | Đăng ký trùng email | Màn hình Đăng ký | Nhập email đã có | `nhanvien@office.vn` | Báo "Email này đã được sử dụng" | | Chưa chạy |
| AUTH-07 | Quên mật khẩu: email sai định dạng | Màn hình Quên mật khẩu | Nhập email sai định dạng | `admin@` | Báo "Email không hợp lệ" | | Chưa chạy |
| AUTH-08 | Quên mật khẩu: OTP sai | Đã gửi yêu cầu cho `admin@office.vn` | Nhập 6 số khác mã demo | `000000` | Báo "Mã xác thực không đúng" | | Chưa chạy |
| AUTH-09 | Quên mật khẩu: luồng đầy đủ | Như trên | Nhập đúng OTP demo → đặt mật khẩu mới → đăng nhập lại | Mật khẩu mới `111111` | Đăng nhập được bằng mật khẩu mới, mật khẩu cũ bị từ chối | | Chưa chạy |
| AUTH-10 | Đổi mật khẩu sai mật khẩu cũ | Đã đăng nhập, vào Đổi mật khẩu | Nhập sai mật khẩu hiện tại | `999999` | Báo "Mật khẩu hiện tại không đúng" | | Chưa chạy |

## 3. Phân quyền theo vai trò (ROLE)

| Mã | Chức năng | Tài khoản | Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| ROLE-01 | Khách điều khiển thiết bị | Khách | Bấm bật/tắt Đèn bàn | Bị từ chối: "Tài khoản Khách chỉ được xem trạng thái thiết bị." Thiết bị không đổi | | Chưa chạy |
| ROLE-02 | Nhân viên điều khiển thiết bị | Nhân viên | Bật Đèn bàn | Đèn bật trong app và trên mạch | | Chưa chạy |
| ROLE-03 | Nhân viên thêm thiết bị | Nhân viên | Vào Thêm thiết bị → Lưu | Bị từ chối: "Chỉ Quản trị viên được thêm, sửa hoặc xóa thiết bị." | | Chưa chạy |
| ROLE-04 | Nhân viên sửa quy tắc tự động | Nhân viên | Tạo quy tắc NẾU/THÌ | Bị từ chối (chỉ Quản trị viên) | | Chưa chạy |
| ROLE-05 | Khách đặt phòng họp | Khách | Đặt phòng họp | Bị từ chối: "Tài khoản Khách không được đặt phòng họp." | | Chưa chạy |
| ROLE-06 | Khách mở cửa chung trong giờ | Khách, giờ máy 10:00 | Mở Cửa chính, nhập PIN `1234` | Cửa mở | | Chưa chạy |
| ROLE-07 | Khách mở cửa ngoài giờ (biên 18:00) | Khách, giờ máy 18:00 | Mở Cửa chính | Bị từ chối (chỉ được 08:00–17:59) | | Chưa chạy |
| ROLE-08 | Nhân viên mở khu vực hạn chế | Nhân viên | Mở Cửa phòng giám đốc | Bị từ chối: "Phòng giám đốc là khu vực hạn chế, chỉ Quản trị viên được mở." | | Chưa chạy |
| ROLE-09 | Xóa Quản trị viên cuối cùng | Quản trị viên | Thành viên → hạ vai trò/xóa admin duy nhất | Báo "Hệ thống phải còn ít nhất một Quản trị viên" | | Chưa chạy |
| ROLE-10 | Tự xóa tài khoản đang đăng nhập | Quản trị viên | Thành viên → xóa chính mình | Báo "Không thể xóa tài khoản đang đăng nhập" | | Chưa chạy |

## 4. Điều khiển thiết bị qua app (DEV), kênh MQTT + Wokwi

Tiền điều kiện chung: mạch Wokwi đang chạy, Serial in `MQTT da ket noi`, app tắt Mô phỏng và chọn MQTT, chấm kết nối màu xanh, đăng nhập Quản trị viên.

| Mã | Chức năng | Các bước | Dữ liệu | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| DEV-01 | Bật/tắt đèn | Bật Đèn bàn (d2) rồi tắt | | LED "Den ban" sáng/tắt; Serial `[CMD] d2 (Den ban) -> BAT/TAT` | Điều khiển từ điện thoại, LED đổi theo | Đạt |
| DEV-02 | Chỉnh độ sáng (PWM) | Đèn trần (d1) kéo độ sáng | 30%, 100%, 0% (biên) | LED d1 sáng mờ/sáng tối đa/tắt; Serial `-> 30%` | Gửi `{"brightness":30}`: LED sáng mờ, Serial `d1 -> 30%` | Đạt |
| DEV-03 | Đổi số quạt | Quạt trần (d5) chọn số 1, 2, 3 | 1, 3 (biên) | LED d5 sáng theo 3 mức; Serial `-> So 3` | Gửi `{"speed":3}`: Serial `d5 -> So 3` | Đạt |
| DEV-04 | Rèm cửa (servo) | Rèm phòng họp (d12) kéo vị trí | 0, 60, 100 | Servo rèm quay 0°/108°/180° | Gửi `{"position":100}`: servo quay | Đạt |
| DEV-05 | Khóa/mở cửa chính (servo) | Mở Cửa chính (d10), nhập PIN | `1234` | Servo cửa quay 90°; Serial `d10 -> MO` | Gửi `{"locked":false}`: servo quay, Serial `-> MO` | Đạt |
| DEV-06 | Điều hòa | Bật Điều hòa phòng họp (d7) | | LED "DH hop" sáng | | Chưa chạy |
| DEV-07 | Servo và PWM chạy đồng thời | Đặt d1 = 30%, d5 số 3, d6 số 1, đồng thời đổi d10 và d12 | | Servo quay đúng, các LED PWM vẫn giữ đúng độ sáng (không xung đột timer) | Cả 5 kênh đúng sau 12 lệnh liên tiếp | Đạt |
| DEV-08 | Khách xem trạng thái | Đăng nhập Khách, mở Đèn trần | | Thấy trạng thái thật, nút điều khiển bị khóa | | Chưa chạy |

## 5. Khóa cửa và mã PIN (PIN)

| Mã | Chức năng | Các bước | Dữ liệu | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| PIN-01 | PIN đúng | Mở Cửa chính → nhập PIN | `1234` | Cửa mở | | Chưa chạy |
| PIN-02 | PIN sai 1 lần | Nhập PIN sai | `0000` | Báo "Mã PIN không đúng", cửa vẫn khóa | | Chưa chạy |
| PIN-03 | Sai 3 lần liên tiếp (biên) | Nhập sai 3 lần | `0000` ×3 | Báo "Sai quá nhiều lần", bàn phím khóa 30 giây, đếm ngược | | Chưa chạy |
| PIN-04 | Hết thời gian khóa | Sau PIN-03, chờ 30 giây, nhập PIN đúng | `1234` | Bàn phím mở lại, cửa mở | | Chưa chạy |
| PIN-05 | Đổi mã PIN | Quản trị viên: Cài đặt → Bảo mật → đổi PIN | `5678` | Báo "Đã đổi mã PIN"; PIN cũ `1234` bị từ chối, `5678` mở được | | Chưa chạy |

## 6. Cảm biến và tự động hóa (AUTO)

| Mã | Chức năng | Các bước | Dữ liệu | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| AUTO-01 | Hiển thị cảm biến | Mở màn Cảm biến; trên Wokwi đổi nhiệt độ DHT22 | 28.5 → 35 °C | App cập nhật nhiệt độ trong vòng vài giây | Broker nhận `{"temperature":28.5,"humidity":65,...}` mỗi 2 giây | Đạt |
| AUTO-02 | Báo động gas tại chỗ | Trên Wokwi vặn biến trở Gas MQ-2 | gas > 400 | Còi kêu liên tục dù không có app; app báo cảnh báo gas | | Chưa chạy |
| AUTO-03 | Gas dưới ngưỡng (biên) | Vặn biến trở về | gas = 400 | Còi không kêu | | Chưa chạy |
| AUTO-04 | Quy tắc NẾU/THÌ | Tạo quy tắc "Nhiệt độ > 30 → bật Quạt trần"; trên Wokwi đặt DHT22 = 32 °C | | Quạt trần bật 1 lần khi điều kiện chuyển sai → đúng; không lặp lại trong 1 phút | | Chưa chạy |
| AUTO-05 | Hẹn giờ | Tạo lịch bật Đèn sảnh ở phút kế tiếp | | Đúng phút đã hẹn đèn bật, chỉ chạy 1 lần | | Chưa chạy |
| AUTO-06 | Ngữ cảnh | Tạo ngữ cảnh "Tan làm" (tắt đèn, khóa cửa) → chạy | | Các thiết bị đổi đúng; cửa yêu cầu PIN | | Chưa chạy |
| AUTO-07 | Ngữ cảnh rỗng | Tạo ngữ cảnh không chọn hành động | | Báo "Chọn ít nhất một hành động" | | Chưa chạy |
| AUTO-08 | Cửa tủ đông mở quá 60 giây | Trên Wokwi gạt công tắc "Cua tu dong" sang mở, chờ > 60 giây | | App cảnh báo nguy hiểm, mạch kêu còi | | Chưa chạy |

## 7. RFID, chấm công, phòng họp (OFF)

| Mã | Chức năng | Các bước | Dữ liệu | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| OFF-01 | Quẹt thẻ hợp lệ | Bấm nút "Quet the RFID" trên Wokwi (thẻ 1) | `3A:7F:22:91` | Servo cửa mở, còi bíp, LCD "Moi vao: Quan tri vien"; sau 5 giây tự khóa; app ghi chấm công | | Chưa chạy |
| OFF-02 | Thẻ Khách trong giờ | Bấm nút đến thẻ thứ 4 | `06:4B:C9:18`, giờ 10:00 | Mạch báo "Cho app xac nhan"; app gửi lệnh mở cửa | | Chưa chạy |
| OFF-03 | Thẻ lạ | Bấm nút đến thẻ thứ 5 | `DE:AD:BE:EF` | Cửa không mở; app cảnh báo thẻ lạ | | Chưa chạy |
| OFF-04 | Đi muộn (biên 08:05) | Quẹt thẻ lúc 08:05 và 08:06 | | 08:05: đúng giờ; 08:06: đi muộn | | Chưa chạy |
| OFF-05 | Đặt phòng họp trùng lịch | Đặt 2 cuộc họp trùng giờ cùng phòng | 09:00–10:00 hai lần | Lần 2 báo "Trùng với một lịch họp khác trong phòng này" | | Chưa chạy |
| OFF-06 | Đặt phòng họp giờ đã qua | Chọn giờ bắt đầu trước giờ hiện tại | | Báo "Giờ này đã qua" | | Chưa chạy |
| OFF-07 | Tự bật phòng họp | Đặt họp bắt đầu sau 10 phút | | Trước giờ họp 10 phút: đèn + điều hòa phòng họp bật; kết thúc: tắt | | Chưa chạy |
| OFF-08 | Gán thẻ RFID sai định dạng | Thành viên → nhập mã thẻ | `12345` | Báo "Mã thẻ dạng AA:BB:CC:DD" | | Chưa chạy |

## 8. Kết nối và đồng bộ MQTT (CONN)

| Mã | Chức năng | Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|
| CONN-01 | Mạch nối mạng và broker | Bấm ▶ trên Wokwi | Serial: `WiFi OK`, `MQTT da ket noi`; broker nhận `status: online Wokwi-ESP32` | Serial in đúng; broker nhận `online Wokwi-ESP32` | Đạt |
| CONN-02 | Không báo "Đã kết nối" ảo | Đang ở chế độ Mô phỏng (xanh) → chuyển sang MQTT khi mạch Wokwi đang TẮT | Chấm kết nối chuyển sang chưa kết nối ngay, không xanh | | Chưa chạy |
| CONN-03 | Chuyển xanh khi mạch online | Tiếp CONN-02, bấm ▶ trên Wokwi | Chấm chuyển xanh khi nhận `status: online` hoặc gói cảm biến | | Chưa chạy |
| CONN-04 | Phát hiện mạch dừng | Đang xanh, bấm ■ dừng Wokwi | Trong khoảng 20 giây app chuyển sang mất kết nối | | Chưa chạy |
| CONN-05 | Mạng chặn cổng 8884 | Điện thoại dùng Wi-Fi chặn cổng lạ | App hiện chưa kết nối, tự thử lại mỗi 10 + 3 giây, không treo | | Chưa chạy |
| CONN-06 | Đồng bộ không dồn gói | Mạch khởi động lại khi app đang mở | Mạch nhận đủ 12 lệnh đồng bộ, mỗi gói cách 80ms, chỉ 1 lượt đồng bộ | Gửi 12 lệnh cách 80ms: Serial nhận đủ 12/12 | Đạt |
| CONN-07 | Lệnh người dùng trong lúc đồng bộ | Ngay khi mạch online, bấm tắt Đèn trần | Trạng thái cuối trên mạch là đèn tắt (không bị gói đồng bộ cũ ghi đè) | | Chưa chạy |
| CONN-08 | Trạng thái từ mạch về app | Quẹt thẻ hợp lệ trên Wokwi | App hiện "Cửa chính được mở (từ mạch)", 5 giây sau "đã khóa lại" | | Chưa chạy |

---

## 9. Tổng hợp

| Nhóm | Số ca | Đạt | Chưa chạy |
|---|---|---|---|
| AUTH: Xác thực | 10 | 0 | 10 |
| ROLE: Phân quyền | 10 | 0 | 10 |
| DEV: Điều khiển thiết bị | 8 | 6 | 2 |
| PIN: Khóa cửa và PIN | 5 | 0 | 5 |
| AUTO: Cảm biến và tự động hóa | 8 | 1 | 7 |
| OFF: RFID, chấm công, phòng họp | 8 | 0 | 8 |
| CONN: Kết nối MQTT | 8 | 2 | 6 |
| **Tổng** | **57** | **9** | **48** |

Các ca **Đạt** đã chạy ngày 25/11/2026 trên mạch Wokwi thật, qua broker HiveMQ (lệnh gửi từ máy tính và từ app trên điện thoại).
