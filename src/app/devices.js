// Tất cả thiết bị: tìm kiếm, lọc theo loại, xóa
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { deviceStatusText, editDeviceRoute, isActive, openDevice } from '../components/DeviceTile';
import { Card, Chip, Empty, Icon, IconButton, Input, Screen } from '../components/ui';
import { useOffice, useTemp } from '../context/OfficeContext';
import { colors, DEVICE_META } from '../theme';
import { confirmAction } from '../utils/helpers';

export default function Devices() {
  const { devices, rooms, toggleDevice, removeDevice, can } = useOffice();
  const { unit } = useTemp();
  const admin = can('device.manage');
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');

  const list = useMemo(() => devices.filter((d) =>
    (type === 'all' || d.type === type) && d.name.toLowerCase().includes(q.trim().toLowerCase())), [devices, q, type]);

  return (
    <Screen title="Quản lý thiết bị" subtitle={`${devices.length} thiết bị`}
      right={admin ? <IconButton icon="plus" color="#fff" bg={colors.primary} onPress={() => router.push('/add-device')} /> : null}>
      <Input icon="magnify" placeholder="Tìm thiết bị..." value={q} onChangeText={setQ} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <Chip label="Tất cả" active={type === 'all'} onPress={() => setType('all')} />
        {Object.entries(DEVICE_META).map(([k, m]) => (
          <Chip key={k} label={m.label} icon={m.icon} color={m.color} active={type === k} onPress={() => setType(k)} />
        ))}
      </ScrollView>
      {list.length === 0 ? <Empty icon="magnify-close" text="Không tìm thấy thiết bị" /> : list.map((d) => {
        const m = DEVICE_META[d.type];
        return (
          <Pressable key={d.id} onPress={() => openDevice(d)} onLongPress={admin ? () => confirmAction(`Xóa thiết bị "${d.name}"?`, () => removeDevice(d.id)) : undefined}>
            <Card style={styles.item}>
              <View style={[styles.icon, { backgroundColor: m.color + '1A' }]}><Icon name={m.icon} size={24} color={m.color} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{d.name}</Text>
                <Text style={styles.sub}>{rooms.find((r) => r.id === d.roomId)?.name} · {deviceStatusText(d, unit)}</Text>
              </View>
              {admin ? <IconButton icon="pencil-outline" size={18} onPress={() => editDeviceRoute(d)} /> : null}
              <View style={{ width: 8 }} />
              <Switch value={isActive(d)} onValueChange={() => toggleDevice(d.id)} trackColor={{ true: m.color }} thumbColor="#fff" activeThumbColor="#fff" />
            </Card>
          </Pressable>
        );
      })}
      <Text style={styles.hint}>{admin ? 'Bút chì: sửa tên/phòng/GPIO · nhấn giữ để xóa' : 'Chỉ Quản trị viên được thêm, sửa, xóa thiết bị'}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, padding: 14 },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.muted, marginTop: 3 },
  hint: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 8 },
});
