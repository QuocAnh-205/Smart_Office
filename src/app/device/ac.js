// Điều khiển điều hòa: nhiệt độ, chế độ, tốc độ quạt
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DeviceChips, NoDevice, useDeviceOfType } from '../../components/DevicePicker';
import { Card, Icon, PowerButton, ProgressBar, Screen, SectionTitle, Segmented } from '../../components/ui';
import { useOffice, useTemp } from '../../context/OfficeContext';
import { colors } from '../../theme';

const MODES = [
  { value: 'cool', label: 'Lạnh', icon: 'snowflake' },
  { value: 'dry', label: 'Khô', icon: 'water-off-outline' },
  { value: 'fan', label: 'Quạt', icon: 'fan' },
  { value: 'heat', label: 'Sưởi', icon: 'white-balance-sunny' },
  { value: 'auto', label: 'Auto', icon: 'autorenew' },
];
const FAN = [
  { value: 'low', label: 'Thấp' },
  { value: 'mid', label: 'Vừa' },
  { value: 'high', label: 'Cao' },
  { value: 'auto', label: 'Tự động' },
];
const MIN = 16;
const MAX = 30;

export default function AcControl() {
  const { list, device, setSelectedId } = useDeviceOfType('ac');
  const { updateDevice, toggleDevice, sensors } = useOffice();
  const { fmt } = useTemp();
  if (!device) return <NoDevice type="ac" />;

  const color = device.mode === 'heat' ? colors.danger : '#3B82F6';
  const setTemp = (t) => {
    const v = Math.max(MIN, Math.min(MAX, t));
    updateDevice(device.id, { temp: v }, `Đặt ${device.name} ${fmt(v)}`);
  };

  return (
    <Screen title="Điều hòa" subtitle={`Nhiệt độ phòng hiện tại ${fmt(sensors.temperature)}`}>
      <DeviceChips list={list} device={device} onSelect={setSelectedId} color={color} />

      <Card style={styles.visual}>
        <Text style={styles.name}>{device.name}</Text>
        <View style={styles.tempRow}>
          <Pressable style={styles.adj} disabled={!device.on} onPress={() => setTemp(device.temp - 1)}>
            <Icon name="minus" size={30} color={device.on ? color : colors.border} />
          </Pressable>
          <View style={[styles.dial, { borderColor: device.on ? color : colors.border }]}>
            <Text style={[styles.temp, { color: device.on ? colors.text : colors.muted }]}>{fmt(device.temp, false)}</Text>
            <Text style={styles.unit}>Nhiệt độ đặt</Text>
          </View>
          <Pressable style={styles.adj} disabled={!device.on} onPress={() => setTemp(device.temp + 1)}>
            <Icon name="plus" size={30} color={device.on ? color : colors.border} />
          </Pressable>
        </View>
        <View style={{ alignSelf: 'stretch', marginTop: 20 }}>
          <ProgressBar value={device.temp - MIN} max={MAX - MIN} color={color} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={styles.small}>{fmt(MIN)}</Text><Text style={styles.small}>{fmt(MAX)}</Text>
          </View>
        </View>
        <View style={{ marginTop: 16 }}>
          <PowerButton on={device.on} color={color} onPress={() => toggleDevice(device.id)} />
        </View>
      </Card>

      <SectionTitle title="Chế độ" />
      <Segmented options={MODES} value={device.mode} color={color} onChange={(v) => updateDevice(device.id, { mode: v }, `${device.name}: chế độ ${MODES.find((m) => m.value === v).label}`)} />

      <SectionTitle title="Tốc độ quạt" />
      <Segmented options={FAN} value={device.fanSpeed} color={color} onChange={(v) => updateDevice(device.id, { fanSpeed: v })} />

      <SectionTitle title="Thông tin" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Info icon="home-thermometer-outline" label="Trong phòng" value={fmt(sensors.temperature)} />
        <Info icon="water-percent" label="Độ ẩm" value={`${sensors.humidity}%`} />
        <Info icon="lightning-bolt-outline" label="Công suất" value={`${device.on ? device.power : 0}W`} />
      </View>
      <Text style={styles.note}>Điều hòa được điều khiển bằng LED hồng ngoại (IR) gắn trên ESP32.</Text>
    </Screen>
  );
}

function Info({ icon, label, value }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', padding: 12 }}>
      <Icon name={icon} size={22} color={colors.primary} />
      <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text, marginTop: 4 }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  visual: { alignItems: 'center', paddingVertical: 24 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 },
  tempRow: { flexDirection: 'row', alignItems: 'center' },
  adj: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  dial: { width: 170, height: 170, borderRadius: 85, borderWidth: 10, alignItems: 'center', justifyContent: 'center', marginHorizontal: 18 },
  temp: { fontSize: 52, fontWeight: '800' },
  unit: { color: colors.muted, fontSize: 12 },
  small: { color: colors.muted, fontSize: 11 },
  note: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 18 },
});
