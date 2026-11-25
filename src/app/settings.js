// Cài đặt ứng dụng
import { useState } from 'react';
import { router } from 'expo-router';
import { Platform, Text } from 'react-native';
import { Button, Card, Input, ListItem, Screen, Segmented, SwitchRow } from '../components/ui';
import { useOffice } from '../context/OfficeContext';
import { colors } from '../theme';
import { confirmAction, showMessage } from '../utils/helpers';

export default function Settings() {
  const { settings, updateSettings, resetData, can, log } = useOffice();
  const admin = can('system.manage');
  const [pin, setPin] = useState('');
  const group = (t) => <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 20, marginBottom: 8, marginLeft: 4 }}>{t}</Text>;

  const conn = settings.mockMode ? 'Đang dùng chế độ mô phỏng' : settings.transport === 'mqtt' ? `MQTT · ${settings.mqttTopic}` : settings.serverUrl;

  const savePin = () => {
    if (!/^\d{4,6}$/.test(pin)) return showMessage('Mã PIN không hợp lệ', 'Mã PIN gồm 4 đến 6 chữ số.');
    if (updateSettings({ doorPin: pin })) {
      log('Đổi mã PIN mở cửa', 'shield-key-outline');
      showMessage('Đã đổi mã PIN', `Từ giờ mở khóa cửa trong app cần nhập mã gồm ${pin.length} chữ số mới.`);
      setPin('');
    }
    return undefined;
  };

  return (
    <Screen title="Cài đặt">
      {group('KẾT NỐI')}
      <Card style={{ paddingVertical: 0 }}>
        <ListItem icon="lan-connect" iconColor={colors.success} title="Kết nối ESP32" subtitle={conn} onPress={() => router.push('/connection')} />
        <SwitchRow icon="refresh-auto" title="Tự động cập nhật cảm biến" subtitle="Mỗi 5 giây (chế độ mô phỏng / Wi-Fi LAN)" value={settings.autoRefresh} onValueChange={(v) => updateSettings({ autoRefresh: v })} last />
      </Card>

      {group('THÔNG BÁO')}
      <Card style={{ paddingVertical: 0 }}>
        <SwitchRow icon="bell-ring-outline" iconColor={colors.warning} title="Thông báo đẩy"
          subtitle={Platform.OS === 'web' ? 'Banner trong app khi có cảnh báo mới' : 'Banner trong app; thông báo hệ thống khi app chạy nền'}
          value={settings.pushNotify} onValueChange={(v) => updateSettings({ pushNotify: v })} />
        <SwitchRow icon="volume-high" iconColor={colors.info} title="Âm thanh & rung cảnh báo" subtitle="Rung khi có cảnh báo nguy hiểm (gas, cửa tủ, xâm nhập)"
          value={settings.sound} onValueChange={(v) => updateSettings({ sound: v })} last />
      </Card>
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6, marginLeft: 4 }}>Tắt thông báo đẩy: cảnh báo vẫn được lưu trong tab Thông báo nhưng không bật banner.</Text>

      {group('HIỂN THỊ')}
      <Card>
        <Text style={{ fontWeight: '600', color: colors.text, marginBottom: 10 }}>Đơn vị nhiệt độ</Text>
        <Segmented value={settings.tempUnit} onChange={(v) => updateSettings({ tempUnit: v })} options={[{ value: 'C', label: '°C' }, { value: 'F', label: '°F' }]} />
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>Áp dụng cho cảm biến, điều hòa, tủ đông, quy tắc tự động. Ngôn ngữ giao diện: Tiếng Việt.</Text>
      </Card>

      {group('BẢO MẬT')}
      <Card>
        <Text style={{ fontWeight: '600', color: colors.text, marginBottom: 4 }}>Mã PIN mở khóa cửa</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>
          Bắt buộc mỗi khi mở cửa từ app (thẻ thiết bị, ngữ cảnh, mở tất cả). Sai 3 lần liên tiếp khóa 30 giây.
        </Text>
        {admin ? (
          <>
            <Input icon="shield-key-outline" placeholder="Mã PIN mới (4–6 số)" value={pin} onChangeText={setPin} keyboardType="number-pad" secure maxLength={6} />
            <Button title="Đổi mã PIN" icon="content-save-outline" variant="outline" onPress={savePin} />
          </>
        ) : <Text style={{ color: colors.muted }}>Chỉ Quản trị viên được đổi mã PIN.</Text>}
      </Card>

      {admin ? (
        <>
          {group('DỮ LIỆU')}
          <Card style={{ paddingVertical: 0 }}>
            <ListItem icon="backup-restore" iconColor={colors.danger} title="Khôi phục dữ liệu mẫu" subtitle="Xóa thay đổi, đưa thiết bị, lịch, chấm công về mặc định" danger
              onPress={() => confirmAction('Khôi phục toàn bộ dữ liệu về mặc định?', resetData, 'Khôi phục')} last />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
