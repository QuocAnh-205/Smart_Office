// Thêm / sửa / xóa phòng. Mở với ?id=<roomId> để sửa.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Chip, Empty, Icon, Input, Screen, SwitchRow } from '../components/ui';
import { useOffice } from '../context/OfficeContext';
import { colors } from '../theme';
import { confirmAction } from '../utils/helpers';

const ICONS = ['desk', 'account-group-outline', 'briefcase-outline', 'coffee-outline', 'door-open', 'server-network', 'printer-outline', 'warehouse', 'sofa-outline', 'toilet'];
const FLOORS = ['Tầng trệt', 'Tầng 1', 'Tầng 2', 'Tầng 3', 'Tầng 4'];

export default function AddRoom() {
  const { id } = useLocalSearchParams();
  const { rooms, devices, addRoom, editRoom, removeRoom, can } = useOffice();
  const room = id ? rooms.find((r) => r.id === id) : null;
  const [name, setName] = useState(room?.name || '');
  const [area, setArea] = useState(room ? String(room.area) : '');
  const [floor, setFloor] = useState(room?.floor || 'Tầng 1');
  const [icon, setIcon] = useState(room?.icon || ICONS[0]);
  const [restricted, setRestricted] = useState(!!room?.restricted);
  const others = rooms.filter((r) => r.id !== id);
  const [moveTo, setMoveTo] = useState(others[0]?.id);
  const [error, setError] = useState('');

  if (!can('room.manage')) {
    return <Screen title={room ? 'Sửa phòng' : 'Thêm phòng'}><Empty icon="shield-lock-outline" text="Chỉ Quản trị viên được thêm, sửa hoặc xóa phòng." /></Screen>;
  }
  if (id && !room) return <Screen title="Sửa phòng"><Empty text="Phòng không tồn tại" /></Screen>;

  const inRoom = room ? devices.filter((d) => d.roomId === room.id) : [];

  const save = () => {
    if (name.trim().length < 2) return setError('Vui lòng nhập tên phòng');
    if (rooms.some((r) => r.id !== id && r.name.trim().toLowerCase() === name.trim().toLowerCase())) return setError('Đã có phòng trùng tên');
    const data = { name: name.trim(), area: Number(area) || 20, floor, icon, restricted };
    const ok = room ? editRoom(room.id, data) : addRoom(data);
    if (ok) router.back();
    return undefined;
  };

  const remove = () => {
    const target = others.find((r) => r.id === moveTo);
    const msg = inRoom.length
      ? `Xóa phòng "${room.name}"? ${inRoom.length} thiết bị sẽ được chuyển sang "${target?.name}". Lịch họp sắp tới của phòng sẽ bị hủy.`
      : `Xóa phòng "${room.name}"?`;
    confirmAction(msg, () => {
      if (removeRoom(room.id, moveTo)) router.replace('/rooms');
    });
  };

  return (
    <Screen title={room ? 'Sửa phòng' : 'Thêm phòng'} subtitle={room ? room.name : 'Tạo khu vực mới trong văn phòng'}>
      <Input label="Tên phòng" icon="door" placeholder="VD: Phòng kế toán" value={name} onChangeText={(v) => { setName(v); setError(''); }} error={error} autoCapitalize="sentences" />
      <Input label="Diện tích (m²)" icon="ruler-square" placeholder="VD: 25" keyboardType="numeric" value={area} onChangeText={setArea} />
      <Text style={styles.label}>Tầng</Text>
      <View style={styles.wrap}>{FLOORS.map((f) => <Chip key={f} label={f} active={floor === f} onPress={() => setFloor(f)} />)}</View>
      <Text style={[styles.label, { marginTop: 8 }]}>Biểu tượng</Text>
      <View style={styles.wrap}>
        {ICONS.map((i) => (
          <Pressable key={i} onPress={() => setIcon(i)} style={[styles.icon, icon === i && { backgroundColor: colors.primary }]}>
            <Icon name={i} size={26} color={icon === i ? '#fff' : colors.primary} />
          </Pressable>
        ))}
      </View>
      <Card style={{ paddingVertical: 0, marginTop: 8 }}>
        <SwitchRow icon="shield-account" iconColor={colors.danger} title="Khu vực hạn chế" subtitle="Chỉ Quản trị viên được mở khóa cửa của phòng này" value={restricted} onValueChange={setRestricted} last />
      </Card>
      <Button title={room ? 'Lưu thay đổi' : 'Tạo phòng'} icon="check" onPress={save} style={{ marginTop: 20 }} />

      {room ? (
        <Card style={{ marginTop: 24 }}>
          <Text style={[styles.label, { color: colors.danger }]}>Xóa phòng</Text>
          {inRoom.length && others.length ? (
            <>
              <Text style={styles.hint}>Chuyển {inRoom.length} thiết bị trong phòng sang:</Text>
              <View style={styles.wrap}>{others.map((r) => <Chip key={r.id} label={r.name} active={moveTo === r.id} onPress={() => setMoveTo(r.id)} />)}</View>
            </>
          ) : null}
          <Button title="Xóa phòng này" variant="danger" icon="delete-outline" onPress={remove} disabled={!others.length} />
          {!others.length ? <Text style={styles.hint}>Không thể xóa phòng duy nhất.</Text> : null}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  hint: { color: colors.muted, fontSize: 12, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  icon: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginBottom: 10 },
});
