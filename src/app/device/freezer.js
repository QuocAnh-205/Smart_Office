// Điều khiển tủ đông lạnh: nhiệt độ ngăn đông, ngăn mát, chế độ, cảnh báo cửa
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { DeviceChips, NoDevice, useDeviceOfType } from '../../components/DevicePicker';
import { Card, Icon, PowerButton, Screen, SectionTitle, Segmented } from '../../components/ui';
import { FREEZER_DOOR_LIMIT_SEC, useOffice, useTemp } from '../../context/OfficeContext';
import { colors } from '../../theme';

const MODES = [
  { value: 'normal', label: 'Bình thường', icon: 'snowflake' },
  { value: 'eco', label: 'Tiết kiệm', icon: 'leaf' },
  { value: 'fast', label: 'Cấp đông nhanh', icon: 'snowflake-alert' },
];
const COLOR = '#0E7490';

function Compartment({ title, icon, value, min, max, onChange, disabled, tint }) {
  const { fmt } = useTemp();
  return (
    <Card style={styles.comp}>
      <View style={styles.compHead}>
        <View style={[styles.compIcon, { backgroundColor: tint + '1F' }]}><Icon name={icon} size={22} color={tint} /></View>
        <Text style={styles.compTitle}>{title}</Text>
      </View>
      <Text style={[styles.compTemp, { color: disabled ? colors.muted : tint }]}>{fmt(value)}</Text>
      <Text style={styles.small}>Khoảng {fmt(min)} → {fmt(max)}</Text>
      <View style={styles.adjRow}>
        <Pressable disabled={disabled || value <= min} style={styles.adj} onPress={() => onChange(value - 1)}>
          <Icon name="minus" size={22} color={disabled ? colors.border : tint} />
        </Pressable>
        <Pressable disabled={disabled || value >= max} style={styles.adj} onPress={() => onChange(value + 1)}>
          <Icon name="plus" size={22} color={disabled ? colors.border : tint} />
        </Pressable>
      </View>
    </Card>
  );
}

export default function FreezerControl() {
  const { list, device, setSelectedId } = useDeviceOfType('freezer');
  const { updateDevice, toggleDevice } = useOffice();
  const { fmt } = useTemp();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!device?.doorOpen) return undefined;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [device?.doorOpen]);
  if (!device) return <NoDevice type="freezer" />;
  const openSec = device.doorOpen && device.doorOpenAt ? Math.max(0, Math.floor((now - device.doorOpenAt) / 1000)) : 0;
  const overdue = openSec >= FREEZER_DOOR_LIMIT_SEC;

  const setMode = (m) => {
    const patch = { mode: m };
    if (m === 'fast') patch.freezerTemp = -24;
    if (m === 'eco') { patch.freezerTemp = -16; patch.fridgeTemp = 6; }
    if (m === 'normal') { patch.freezerTemp = -18; patch.fridgeTemp = 4; }
    updateDevice(device.id, patch, `${device.name}: chế độ ${MODES.find((x) => x.value === m).label}`);
  };

  return (
    <Screen title="Tủ đông lạnh" subtitle={device.name}>
      <DeviceChips list={list} device={device} onSelect={setSelectedId} color={COLOR} />

      <Card style={styles.visual}>
        <View style={styles.fridge}>
          <View style={[styles.door, { flex: 1.1 }, device.on && { backgroundColor: '#CFFAFE' }]}>
            <Icon name="snowflake" size={30} color={device.on ? COLOR : colors.border} />
            <Text style={styles.doorText}>Ngăn đông</Text>
            <Text style={styles.doorTemp}>{fmt(device.freezerTemp, false)}</Text>
          </View>
          <View style={[styles.door, device.on && { backgroundColor: '#E0F2FE' }]}>
            <Icon name="fridge-industrial-outline" size={30} color={device.on ? '#0284C7' : colors.border} />
            <Text style={styles.doorText}>Ngăn mát</Text>
            <Text style={styles.doorTemp}>{fmt(device.fridgeTemp, false)}</Text>
          </View>
        </View>
        <View style={[styles.doorStatus, { backgroundColor: device.doorOpen ? colors.danger + '1A' : colors.success + '1A' }]}>
          <Icon name={device.doorOpen ? 'door-open' : 'door-closed'} size={18} color={device.doorOpen ? colors.danger : colors.success} />
          <Text style={{ color: device.doorOpen ? colors.danger : colors.success, fontWeight: '700', marginLeft: 6 }}>
            {device.doorOpen ? `Cửa tủ đang mở · ${openSec} giây${overdue ? ' · ĐÃ CẢNH BÁO' : ''}` : 'Cửa tủ đã đóng'}
          </Text>
        </View>
        <View style={{ marginTop: 16 }}>
          <PowerButton on={device.on} color={COLOR} onPress={() => toggleDevice(device.id)} />
        </View>
      </Card>

      <SectionTitle title="Nhiệt độ" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Compartment title="Ngăn đông" icon="snowflake" tint={COLOR} value={device.freezerTemp} min={-24} max={-14} disabled={!device.on}
          onChange={(v) => updateDevice(device.id, { freezerTemp: v }, `Ngăn đông ${fmt(v)}`)} />
        <Compartment title="Ngăn mát" icon="thermometer-low" tint="#0284C7" value={device.fridgeTemp} min={1} max={8} disabled={!device.on}
          onChange={(v) => updateDevice(device.id, { fridgeTemp: v }, `Ngăn mát ${fmt(v)}`)} />
      </View>

      <SectionTitle title="Chế độ hoạt động" />
      <Segmented options={MODES} value={device.mode} color={COLOR} onChange={setMode} />

      <SectionTitle title="Cảm biến cửa (mô phỏng)" />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="magnet" size={22} color={COLOR} />
          <Text style={{ flex: 1, marginLeft: 12, fontWeight: '600', color: colors.text }}>Cửa tủ đang mở</Text>
          <Switch value={device.doorOpen} onValueChange={(v) => updateDevice(device.id, { doorOpen: v }, v ? `Cửa ${device.name} mở` : `Cửa ${device.name} đóng`)} trackColor={{ true: colors.danger }} thumbColor="#fff" activeThumbColor="#fff" />
        </View>
        <Text style={styles.small}>Công tắc từ (reed switch) gắn ở cửa tủ, báo về ESP32. Mở quá {FREEZER_DOOR_LIMIT_SEC} giây: app gửi cảnh báo nguy hiểm và kêu còi trên mạch.</Text>
      </Card>
      <Text style={styles.note}>Cảm biến nhiệt DS18B20 chống nước đặt trong từng ngăn · Công suất {device.power} W</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  visual: { alignItems: 'center', paddingVertical: 20 },
  fridge: { flexDirection: 'row', width: '85%', height: 200, borderRadius: 18, borderWidth: 3, borderColor: colors.border, overflow: 'hidden', gap: 3, backgroundColor: colors.border },
  door: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  doorText: { color: colors.muted, fontSize: 12, marginTop: 6 },
  doorTemp: { fontSize: 30, fontWeight: '800', color: colors.text },
  doorStatus: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginTop: 14 },
  comp: { flex: 1, padding: 14 },
  compHead: { flexDirection: 'row', alignItems: 'center' },
  compIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  compTitle: { fontWeight: '700', color: colors.text },
  compTemp: { fontSize: 32, fontWeight: '800', marginTop: 10 },
  small: { color: colors.muted, fontSize: 11, marginTop: 6 },
  adjRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  adj: { flex: 1, height: 40, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  note: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 18 },
});
