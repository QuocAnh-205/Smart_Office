// Danh sách phòng
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Icon, IconButton, Screen, StatCard } from '../../components/ui';
import { useOffice } from '../../context/OfficeContext';
import { colors } from '../../theme';

export default function Rooms() {
  const { rooms, devices, can } = useOffice();

  return (
    <Screen title="Phòng" subtitle={`${rooms.length} khu vực · ${devices.length} thiết bị`} back={false}
      right={can('room.manage') ? <IconButton icon="plus" color="#fff" bg={colors.primary} onPress={() => router.push('/add-room')} /> : null}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <StatCard icon="floor-plan" label="Tổng số phòng" value={rooms.length} />
        <StatCard icon="power" label="Thiết bị đang bật" value={devices.filter((d) => d.on && d.type !== 'door').length} color={colors.success} />
      </View>
      {rooms.map((r) => {
        const list = devices.filter((d) => d.roomId === r.id);
        const on = list.filter((d) => d.on && d.type !== 'door').length;
        return (
          <Card key={r.id} style={styles.room} onPress={() => router.push(`/room/${r.id}`)}>
            <View style={styles.icon}><Icon name={r.icon} size={28} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{r.name}{r.restricted ? '  🔒' : ''}</Text>
              <Text style={styles.sub}>{r.floor} · {r.area} m² · {list.length} thiết bị</Text>
              <View style={styles.pill}>
                <View style={[styles.dot, { backgroundColor: on ? colors.success : colors.muted }]} />
                <Text style={styles.pillText}>{on ? `${on} thiết bị đang bật` : 'Tất cả đang tắt'}</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color={colors.muted} />
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  room: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  icon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.muted, marginTop: 3 },
  pill: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  pillText: { fontSize: 12, color: colors.text, fontWeight: '500' },
});
