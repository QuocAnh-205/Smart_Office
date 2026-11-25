// Trợ giúp & câu hỏi thường gặp
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, Icon, Screen, SectionTitle } from '../components/ui';
import { colors } from '../theme';

const FAQ = [
  ['Làm sao kết nối app với ESP32?', 'Vào Cá nhân → Kết nối ESP32, tắt chế độ mô phỏng, nhập địa chỉ IP của ESP32 (xem trên Serial Monitor) rồi bấm Kiểm tra.'],
  ['Không điều khiển được thiết bị?', 'Kiểm tra điện thoại và ESP32 cùng mạng Wi-Fi, ESP32 đã cấp nguồn, relay được nối đúng chân GPIO như trong firmware.'],
  ['Ngữ cảnh là gì?', 'Ngữ cảnh là tập hợp nhiều hành động chạy cùng lúc, ví dụ "Tan làm" sẽ tắt đèn, quạt, điều hòa và khóa cửa.'],
  ['Quy tắc tự động hoạt động thế nào?', 'Quy tắc cảm biến chạy khi điều kiện chuyển từ sai sang đúng (VD nhiệt độ vừa vượt 30°C), tối đa 1 lần/phút. Quy tắc theo giờ chạy đúng giờ mỗi ngày. Mỗi lần chạy app gửi lệnh xuống ESP32, ghi lịch sử và gửi thông báo.'],
  ['Hẹn giờ có chạy khi tắt app không?', 'Bộ hẹn giờ, đếm ngược quạt, cảnh báo cửa tủ đông và lịch phòng họp chạy trong app khi app đang mở. Cảnh báo khí gas tại chỗ (còi) do ESP32 tự xử lý nên vẫn hoạt động khi không có app.'],
  ['Mã PIN mở cửa mặc định?', 'Mã PIN mặc định là 1234, Quản trị viên đổi được trong Cài đặt → Bảo mật. Mọi thao tác mở khóa cửa trong app đều phải nhập PIN; sai 3 lần liên tiếp bàn phím bị khóa 30 giây.'],
  ['Các vai trò khác nhau thế nào?', 'Quản trị viên: toàn quyền. Nhân viên: điều khiển thiết bị, chạy ngữ cảnh, đặt phòng họp, mở cửa khu vực chung. Khách: chỉ xem, được mở cửa khu vực chung trong giờ 08:00–18:00. Phòng đánh dấu "Khu vực hạn chế" chỉ Quản trị viên được mở.'],
  ['Quẹt thẻ RFID để làm gì?', 'Thẻ đã gán cho thành viên dùng để chấm công (lần đầu trong ngày là Vào, các lần sau là Ra, sau 08:05 tính đi muộn) và mở cửa chính 5 giây.'],
  ['Quên mật khẩu?', 'Tại màn hình đăng nhập chọn "Quên mật khẩu?", nhập email và mã OTP để đặt lại.'],
];

export default function Help() {
  const [open, setOpen] = useState(0);
  return (
    <Screen title="Trợ giúp">
      <Card style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight }}>
        <Icon name="lifebuoy" size={36} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontWeight: '800', color: colors.primaryDark }}>Cần hỗ trợ?</Text>
          <Text style={{ color: colors.primaryDark, marginTop: 2 }}>Liên hệ bộ phận IT: hotline nội bộ 101</Text>
        </View>
      </Card>
      <SectionTitle title="Câu hỏi thường gặp" />
      {FAQ.map(([q, a], i) => (
        <Card key={q} style={{ marginBottom: 10 }}>
          <Pressable onPress={() => setOpen(open === i ? -1 : i)} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontWeight: '700', color: colors.text }}>{q}</Text>
            <Icon name={open === i ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />
          </Pressable>
          {open === i ? <Text style={{ color: colors.muted, marginTop: 10, lineHeight: 20 }}>{a}</Text> : null}
        </Card>
      ))}
    </Screen>
  );
}
