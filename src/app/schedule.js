// Hẹn giờ bật/tắt thiết bị
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, Chip, Empty, Icon, Screen, SectionTitle, Segmented } from '../components/ui';
import { useOffice } from '../context/OfficeContext';
import { colors, DEVICE_META } from '../theme';
import { confirmAction, DAY_LABELS, showMessage } from '../utils/helpers';

const pad = (n) => String(n).padStart(2, '0');

export default function Schedule() {
  const { schedules, devices, addSchedule, toggleSchedule, removeSchedule, can } = useOffice();
  const admin = can('automation.manage');
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [deviceId, setDeviceId] = useState(devices[0]?.id);
  const [action, setAction] = useState('on');

  const toggleDay = (d) => setDays((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d].sort()));

  const save = () => {
    if (!deviceId || !days.length) return showMessage('Thiếu thông tin', 'Chọn thiết bị và ít nhất một ngày.');
    if (!addSchedule({ time: `${pad(hour)}:${pad(minute)}`, days, deviceId, action })) return undefined;
    showMessage('Đã thêm lịch', `${action === 'on' ? 'Bật' : 'Tắt'} lúc ${pad(hour)}:${pad(minute)}`);
    return undefined;
  };

  // Đặt nhanh giờ = hiện tại + 1 phút, lặp lại hôm nay (tiện để demo)
  const quickTest = () => {
    const d = new Date(Date.now() + 60000);
    setHour(d.getHours());
    setMinute(d.getMinutes());
    setDays((x) => (x.includes(d.getDay()) ? x : [...x, d.getDay()].sort()));
  };

  return (
    <Screen title="Hẹn giờ" subtitle="Tự động bật/tắt theo lịch">
      {admin ? (
      <Card>
        <Text style={styles.label}>Thời gian</Text>
        <View style={styles.timeRow}>
          <Spinner value={hour} onChange={(v) => setHour((v + 24) % 24)} />
          <Text style={styles.colon}>:</Text>
          <Spinner value={minute} step={1} onChange={(v) => setMinute((v + 60) % 60)} />
        </View>
        <Pressable onPress={quickTest} style={styles.quick}><Icon name="timer-outline" size={16} color={colors.primary} /><Text style={styles.quickText}>Sau 1 phút nữa (thử nhanh)</Text></Pressable>

        <Text style={styles.label}>Lặp lại</Text>
        <View style={styles.days}>
          {DAY_LABELS.map((d, i) => (
            <Pressable key={d} onPress={() => toggleDay(i)} style={[styles.day, days.includes(i) && styles.dayOn]}>
              <Text style={[styles.dayText, days.includes(i) && { color: '#fff' }]}>{d}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Hành động</Text>
        <Segmented value={action} onChange={setAction} options={[{ value: 'on', label: 'Bật', icon: 'power' }, { value: 'off', label: 'Tắt', icon: 'power-off' }]} />

        <Text style={[styles.label, { marginTop: 14 }]}>Thiết bị</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {devices.filter((d) => d.type !== 'door').map((d) => (
            <Chip key={d.id} label={d.name} icon={DEVICE_META[d.type].icon} active={deviceId === d.id} onPress={() => setDeviceId(d.id)} />
          ))}
        </View>
        <Button title="Thêm lịch" icon="calendar-plus" onPress={save} style={{ marginTop: 8 }} />
      </Card>
      ) : (
        <Card><Text style={{ color: colors.muted }}>Bạn chỉ xem được lịch hẹn giờ. Chỉ Quản trị viên được tạo, bật/tắt hoặc xóa lịch.</Text></Card>
      )}

      <Text style={styles.note}>Đến giờ, app tự gửi lệnh bật/tắt xuống ESP32 và tạo thông báo. Bộ hẹn giờ chạy khi app đang mở.</Text>
      <SectionTitle title={`Lịch đã tạo (${schedules.length})`} />
      {schedules.length ? schedules.map((s) => {
        const d = devices.find((x) => x.id === s.deviceId);
        return (
          <Card key={s.id} style={styles.item}>
            <Icon name={d ? DEVICE_META[d.type].icon : 'help'} size={26} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.time}>{s.time} <Text style={{ fontSize: 14, color: s.action === 'on' ? colors.success : colors.danger }}>{s.action === 'on' ? 'BẬT' : 'TẮT'}</Text></Text>
              <Text style={styles.sub}>{d?.name || 'Thiết bị đã xóa'} · {s.days.map((x) => DAY_LABELS[x]).join(', ')}</Text>
            </View>
            <Switch value={s.enabled} disabled={!admin} onValueChange={() => toggleSchedule(s.id)} trackColor={{ true: colors.primary }} thumbColor="#fff" activeThumbColor="#fff" />
            {admin ? (
              <Pressable hitSlop={8} onPress={() => confirmAction('Xóa lịch này?', () => removeSchedule(s.id))} style={{ marginLeft: 6 }}>
                <Icon name="trash-can-outline" size={22} color={colors.danger} />
              </Pressable>
            ) : null}
          </Card>
        );
      }) : <Empty icon="calendar-blank-outline" text="Chưa có lịch hẹn giờ" />}
    </Screen>
  );
}

function Spinner({ value, onChange, step = 1 }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable onPress={() => onChange(value + step)} style={styles.spinBtn}><Icon name="chevron-up" size={28} color={colors.primary} /></Pressable>
      <Text style={styles.spinVal}>{pad(value)}</Text>
      <Pressable onPress={() => onChange(value - step)} style={styles.spinBtn}><Icon name="chevron-down" size={28} color={colors.primary} /></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
  timeRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  colon: { fontSize: 44, fontWeight: '800', color: colors.text, marginHorizontal: 12 },
  spinBtn: { padding: 4 },
  spinVal: { fontSize: 48, fontWeight: '800', color: colors.text, width: 80, textAlign: 'center' },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  day: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: colors.primary },
  dayText: { fontWeight: '700', color: colors.muted, fontSize: 12 },
  quick: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -6, marginBottom: 14 },
  quickText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  note: { color: colors.muted, fontSize: 12, marginTop: 12, textAlign: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  time: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
