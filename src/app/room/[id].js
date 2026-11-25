// Chi tiết phòng: thiết bị trong phòng + điều khiển nhanh
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DeviceTile from '../../components/DeviceTile';
import { Button, Empty, Icon, IconButton, Screen, SectionTitle } from '../../components/ui';
import { useOffice, useTemp } from '../../context/OfficeContext';
import { gradients, radius } from '../../theme';

export default function RoomDetail() {
  const { id } = useLocalSearchParams();
  const { rooms, devices, sensors, setRoomPower, can } = useOffice();
  const { fmt } = useTemp();
  const room = rooms.find((r) => r.id === id);
  const list = devices.filter((d) => d.roomId === id);

  if (!room) return <Screen title="Không tìm thấy phòng"><Empty text="Phòng không tồn tại" /></Screen>;

  const allOff = () => setRoomPower(room.id, false);
  const allOn = () => setRoomPower(room.id, true);
  const power = list.filter((d) => d.on && d.type !== 'door').reduce((s, d) => s + (d.power || 0), 0);
  const admin = can('room.manage');

  return (
    <Screen title={room.name} subtitle={`${room.floor} · ${room.area} m²${room.restricted ? ' · Khu vực hạn chế' : ''}`}
      right={admin ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon="pencil-outline" onPress={() => router.push({ pathname: '/add-room', params: { id: room.id } })} />
          <IconButton icon="plus" onPress={() => router.push({ pathname: '/add-device', params: { roomId: room.id } })} />
        </View>
      ) : null}>
      <LinearGradient colors={gradients.primary} style={styles.hero}>
        <Icon name={room.icon} size={40} color="#fff" />
        <View style={styles.heroRow}>
          <Item icon="thermometer" value={fmt(sensors.temperature)} label="Nhiệt độ" />
          <Item icon="water-percent" value={`${sensors.humidity}%`} label="Độ ẩm" />
          <Item icon="power-plug-outline" value={`${list.filter((d) => d.on && d.type !== 'door').length}/${list.length}`} label="Đang bật" />
          <Item icon="lightning-bolt" value={`${power}W`} label="Công suất" />
        </View>
      </LinearGradient>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <Button title="Bật tất cả" icon="power" style={{ flex: 1 }} onPress={allOn} />
        <Button title="Tắt tất cả" variant="outline" icon="power-off" style={{ flex: 1 }} onPress={allOff} />
      </View>

      <SectionTitle title={`Thiết bị (${list.length})`} />
      {list.length ? (
        <View style={styles.grid}>{list.map((d) => <DeviceTile key={d.id} device={d} />)}</View>
      ) : (
        <Empty icon="devices" text="Phòng này chưa có thiết bị" />
      )}
      <Text style={{ textAlign: 'center', color: '#64748B', fontSize: 12 }}>
        {admin ? 'Nhấn giữ một thiết bị để sửa · "Bật/Tắt tất cả" bỏ qua cửa, camera, tủ đông' : '"Bật/Tắt tất cả" bỏ qua cửa, camera, tủ đông'}
      </Text>
    </Screen>
  );
}

function Item({ icon, value, label }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Icon name={icon} size={18} color="#fff" />
      <Text style={{ color: '#fff', fontWeight: '800', marginTop: 4 }}>{value}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: 20 },
  heroRow: { flexDirection: 'row', marginTop: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
