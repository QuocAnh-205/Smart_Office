// Thêm thiết bị mới / sửa thiết bị (?id=<deviceId>): loại, tên, phòng, công suất, chân GPIO
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Chip, Empty, Icon, Input, Screen, SectionTitle } from '../components/ui';
import { useOffice } from '../context/OfficeContext';
import { colors, DEVICE_META } from '../theme';
import { confirmAction } from '../utils/helpers';

const GPIO = ['2', '4', '5', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '23', '25', '26', '27', '32', '33'];

export default function AddDevice() {
  const { roomId, id } = useLocalSearchParams();
  const { rooms, devices, addDevice, editDevice, removeDevice, can } = useOffice();
  const editing = id ? devices.find((d) => d.id === id) : null;
  const [type, setType] = useState(editing?.type || 'light');
  const [name, setName] = useState(editing?.name || '');
  const [room, setRoom] = useState(editing?.roomId || roomId || rooms[0]?.id);
  const [pin, setPin] = useState(editing?.pin ? String(editing.pin) : '2');
  const [power, setPower] = useState(editing?.power ? String(editing.power) : '');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState(null);

  const scan = () => {
    setScanning(true);
    setFound(null);
    setTimeout(() => {
      setScanning(false);
      setFound({ name: `ESP32-${Math.floor(Math.random() * 9000 + 1000)}`, ip: `192.168.1.${Math.floor(Math.random() * 150 + 100)}` });
    }, 1800);
  };

  if (!can('device.manage')) {
    return <Screen title={editing ? 'Sửa thiết bị' : 'Thêm thiết bị'}><Empty icon="shield-lock-outline" text="Chỉ Quản trị viên được thêm, sửa hoặc xóa thiết bị." /></Screen>;
  }
  if (id && !editing) return <Screen title="Sửa thiết bị"><Empty text="Thiết bị không tồn tại" /></Screen>;

  const save = () => {
    if (name.trim().length < 2) return setError('Vui lòng nhập tên thiết bị');
    if (power && (Number.isNaN(Number(power)) || Number(power) < 0)) return setError('Công suất phải là số dương');
    const extra = power ? { power: Number(power) } : {};
    const data = { name: name.trim(), roomId: room, pin: Number(pin), ...extra };
    const ok = editing ? editDevice(editing.id, data) : addDevice({ type, ...data });
    if (ok) router.back();
    return undefined;
  };

  const remove = () => confirmAction(`Xóa thiết bị "${editing.name}"? Lịch hẹn giờ của thiết bị cũng bị xóa.`, () => {
    if (removeDevice(editing.id)) router.back();
  });

  return (
    <Screen title={editing ? 'Sửa thiết bị' : 'Thêm thiết bị'} subtitle={editing ? `${DEVICE_META[editing.type].label} · ${editing.id}` : 'Kết nối thiết bị mới vào hệ thống'}>
      {editing ? null : (
      <Card style={styles.scan}>
        {scanning ? <ActivityIndicator size="large" color={colors.primary} /> : <Icon name="wifi-sync" size={40} color={colors.primary} />}
        <Text style={styles.scanText}>{scanning ? 'Đang quét mạng Wi-Fi nội bộ...' : found ? `Tìm thấy ${found.name} (${found.ip})` : 'Quét tìm module ESP32 trong mạng LAN'}</Text>
        <Button variant="outline" title={found ? 'Quét lại' : 'Bắt đầu quét'} icon="radar" onPress={scan} disabled={scanning} style={{ alignSelf: 'stretch', marginTop: 12 }} />
      </Card>
      )}

      {editing ? null : <SectionTitle title="Loại thiết bị" />}
      {editing ? null : (
      <View style={styles.types}>
        {Object.entries(DEVICE_META).map(([k, m]) => (
          <Pressable key={k} onPress={() => setType(k)} style={[styles.type, type === k && { borderColor: m.color, backgroundColor: m.color + '12' }]}>
            <Icon name={m.icon} size={28} color={m.color} />
            <Text style={styles.typeLabel}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
      )}

      <SectionTitle title="Thông tin" />
      <Input label="Tên thiết bị" icon="tag-outline" placeholder={`VD: ${DEVICE_META[type].label} phòng họp`} value={name} onChangeText={(v) => { setName(v); setError(''); }} error={error} autoCapitalize="sentences" />
      <Input label="Công suất (W)" icon="lightning-bolt-outline" placeholder="VD: 40" keyboardType="numeric" value={power} onChangeText={setPower} />

      <Text style={styles.label}>Phòng</Text>
      <View style={styles.wrap}>
        {rooms.map((r) => <Chip key={r.id} label={r.name} active={room === r.id} onPress={() => setRoom(r.id)} />)}
      </View>

      <Text style={[styles.label, { marginTop: 8 }]}>Chân GPIO trên ESP32</Text>
      <View style={styles.wrap}>
        {GPIO.map((g) => <Chip key={g} label={`GPIO${g}`} active={pin === g} onPress={() => setPin(g)} />)}
      </View>

      <Button title={editing ? 'Lưu thay đổi' : 'Lưu thiết bị'} icon="content-save-outline" onPress={save} style={{ marginTop: 16 }} />
      {editing ? <Button title="Xóa thiết bị" variant="danger" icon="delete-outline" onPress={remove} style={{ marginTop: 12 }} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scan: { alignItems: 'center', paddingVertical: 20 },
  scanText: { marginTop: 10, color: colors.text, fontWeight: '600', textAlign: 'center' },
  types: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  type: { width: '31%', alignItems: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, marginBottom: 10 },
  typeLabel: { fontSize: 12, fontWeight: '600', color: colors.text, marginTop: 6 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
