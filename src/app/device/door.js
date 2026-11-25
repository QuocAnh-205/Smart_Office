// Khóa cửa thông minh: khóa/mở (mở luôn cần mã PIN qua hộp PIN chung), phân quyền, lịch sử ra vào
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DeviceChips, NoDevice, useDeviceOfType } from '../../components/DevicePicker';
import { Button, Card, Icon, ListItem, Screen, SectionTitle } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { RFID_UNLOCK_SEC, useOffice } from '../../context/OfficeContext';
import { colors } from '../../theme';
import { check } from '../../utils/permissions';

export default function DoorControl() {
  const { list, device, setSelectedId } = useDeviceOfType('door');
  const { toggleDevice, setAllOfType, history, rooms } = useOffice();
  const { user, users } = useAuth();
  if (!device) return <NoDevice type="door" />;

  const color = device.locked ? colors.success : colors.warning;
  const room = rooms.find((r) => r.id === device.roomId);
  const perm = check(user, 'door.unlock', { room });
  const doorLogs = history.filter((h) => h.text.includes(device.name) || (device.id === 'd10' && h.text.includes('quẹt thẻ'))).slice(0, 6);
  const cards = users.filter((u) => u.card).length;

  return (
    <Screen title="Khóa cửa thông minh" subtitle={`${list.filter((d) => d.locked).length}/${list.length} cửa đã khóa`}>
      <DeviceChips list={list} device={device} onSelect={setSelectedId} color={colors.success} />

      <Card style={styles.visual}>
        <Pressable onPress={() => toggleDevice(device.id)} style={[styles.lock, { backgroundColor: color + '1A', borderColor: color }]}>
          <Icon name={device.locked ? 'lock' : 'lock-open-variant'} size={80} color={color} />
        </Pressable>
        <Text style={styles.name}>{device.name}</Text>
        <Text style={[styles.status, { color }]}>{device.locked ? 'Đã khóa an toàn' : 'Đang mở khóa'}</Text>
        <Text style={styles.small}>Chạm vào ổ khóa để {device.locked ? 'mở (cần mã PIN)' : 'khóa'}</Text>
        {room?.restricted ? (
          <View style={styles.restrict}><Icon name="shield-account" size={16} color={colors.danger} /><Text style={styles.restrictText}>Khu vực hạn chế · chỉ Quản trị viên được mở</Text></View>
        ) : null}
        {device.locked && !perm.ok ? <Text style={[styles.small, { color: colors.danger, textAlign: 'center' }]}>{perm.reason}</Text> : null}
      </Card>

      <SectionTitle title="Phương thức mở khóa" />
      <Card style={{ paddingVertical: 0 }}>
        <ListItem icon="dialpad" iconColor={colors.success} title="Mã PIN" subtitle="Bắt buộc khi mở từ app · sai 3 lần khóa 30 giây" right={<Icon name="check-circle" size={20} color={colors.success} />} />
        <ListItem icon="card-account-details-outline" iconColor={colors.primary} title="Thẻ RFID" subtitle={`Module RC522 · ${cards} thẻ đã đăng ký · mở cửa chính ${RFID_UNLOCK_SEC} giây`} right={<Icon name="check-circle" size={20} color={colors.success} />} />
        <ListItem icon="cellphone-key" iconColor={colors.purple} title="Ứng dụng di động" subtitle="Qua Wi-Fi / MQTT · kiểm tra quyền theo vai trò" right={<Icon name="check-circle" size={20} color={colors.success} />} last />
      </Card>

      <SectionTitle title="Tất cả cửa" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button title="Khóa tất cả" icon="lock" style={{ flex: 1 }} onPress={() => setAllOfType('door', { locked: true }, 'Khóa tất cả cửa')} />
        <Button title="Mở tất cả" variant="outline" icon="lock-open-variant-outline" style={{ flex: 1 }} onPress={() => setAllOfType('door', { locked: false }, 'Mở tất cả cửa')} />
      </View>

      <SectionTitle title="Lịch sử gần đây" />
      <Card style={{ paddingVertical: 0 }}>
        {doorLogs.length ? doorLogs.map((h, i) => (
          <ListItem key={h.id} icon={h.icon || (h.text.startsWith('Khóa') ? 'lock' : 'lock-open-variant')} iconColor={colors.success} title={h.text} subtitle={`${h.time} · ${h.date}${h.by ? ` · ${h.by}` : ''}`} last={i === doorLogs.length - 1} />
        )) : <Text style={{ color: colors.muted, padding: 16, textAlign: 'center' }}>Chưa có lịch sử</Text>}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  visual: { alignItems: 'center', paddingVertical: 28 },
  lock: { width: 160, height: 160, borderRadius: 80, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
  status: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  small: { color: colors.muted, fontSize: 12, marginTop: 6 },
  restrict: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.danger + '12', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginTop: 12 },
  restrictText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
});
