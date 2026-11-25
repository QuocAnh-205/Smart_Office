import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Icon } from './ui';
import { colors, DEVICE_META, radius, shadow } from '../theme';
import { useOffice, useTemp } from '../context/OfficeContext';
import { fmtTemp } from '../utils/time';

export function deviceStatusText(d, unit = 'C') {
  switch (d.type) {
    case 'light': return d.on ? `Độ sáng ${d.brightness}%` : 'Đang tắt';
    case 'fan': {
      if (!d.on) return 'Đang tắt';
      const left = d.timerEnd ? Math.max(1, Math.ceil((d.timerEnd - Date.now()) / 60000)) : 0;
      return `Tốc độ ${d.speed}${left ? ` · tắt sau ${left}'` : ''}`;
    }
    case 'ac': return d.on ? `${fmtTemp(d.temp, unit)} · ${({ cool: 'Làm lạnh', dry: 'Hút ẩm', fan: 'Quạt', heat: 'Sưởi', auto: 'Tự động' })[d.mode]}` : 'Đang tắt';
    case 'freezer':
      if (d.doorOpen) return 'Cửa tủ đang mở!';
      return d.on ? `Đông ${fmtTemp(d.freezerTemp, unit)} · Mát ${fmtTemp(d.fridgeTemp, unit)}` : 'Đang tắt';
    case 'door': return d.locked ? 'Đã khóa' : 'Đang mở khóa';
    case 'curtain': return d.on ? `Mở ${d.position}%` : 'Đang tắt';
    case 'camera': return d.on ? (d.recording ? 'Đang ghi hình' : 'Trực tuyến') : 'Ngoại tuyến';
    default: return d.on ? 'Bật' : 'Tắt';
  }
}

export const isActive = (d) => (d.type === 'door' ? d.locked : d.on);

export const openDevice = (d) => router.push({ pathname: DEVICE_META[d.type].route, params: { id: d.id } });
export const editDeviceRoute = (d) => router.push({ pathname: '/add-device', params: { id: d.id } });

/** Ô thiết bị dạng lưới ở trang chủ / phòng */
export default function DeviceTile({ device }) {
  const { toggleDevice, rooms, can } = useOffice();
  const { unit } = useTemp();
  const meta = DEVICE_META[device.type];
  const active = isActive(device);
  const room = rooms.find((r) => r.id === device.roomId);

  const inner = (
    <>
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : meta.color + '18' }]}>
          <Icon name={device.type === 'door' ? (device.locked ? 'lock' : 'lock-open-variant') : meta.icon} size={24} color={active ? '#fff' : meta.color} />
        </View>
        <Switch
          value={active}
          onValueChange={() => toggleDevice(device.id)}
          trackColor={{ true: 'rgba(255,255,255,0.45)', false: colors.border }}
          thumbColor="#fff" activeThumbColor="#fff"
          style={{ transform: [{ scale: 0.85 }] }}
        />
      </View>
      <Text style={[styles.name, active && { color: '#fff' }]} numberOfLines={1}>{device.name}</Text>
      <Text style={[styles.sub, active && { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={1}>{room?.name}</Text>
      <Text style={[styles.status, active && { color: '#fff' }]} numberOfLines={1}>{deviceStatusText(device, unit)}</Text>
    </>
  );

  return (
    <Pressable onPress={() => openDevice(device)} onLongPress={can('device.manage') ? () => editDeviceRoute(device) : undefined} style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.98 }] }]}>
      {active ? (
        <LinearGradient colors={meta.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.inner, { borderColor: 'transparent' }]}>{inner}</LinearGradient>
      ) : (
        <View style={[styles.inner, { backgroundColor: colors.card }]}>{inner}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { width: '48%', marginBottom: 14, borderRadius: radius.lg, ...shadow },
  inner: { borderRadius: radius.lg, padding: 14, minHeight: 156, borderWidth: 1, borderColor: '#EEF1F7' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  status: { fontSize: 12, color: colors.muted, marginTop: 10, fontWeight: '700' },
});
