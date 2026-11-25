// Điều khiển đèn: bật/tắt, độ sáng, nhiệt độ màu, chế độ ánh sáng
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { DeviceChips, NoDevice, useDeviceOfType } from '../../components/DevicePicker';
import { Button, Card, Chip, Icon, PowerButton, Screen, SectionTitle } from '../../components/ui';
import { useOffice } from '../../context/OfficeContext';
import { colors } from '../../theme';

const PRESETS = [
  { label: 'Đọc sách', icon: 'book-open-variant', brightness: 90, colorTemp: 5000 },
  { label: 'Làm việc', icon: 'laptop', brightness: 100, colorTemp: 6000 },
  { label: 'Thư giãn', icon: 'sofa-outline', brightness: 40, colorTemp: 2800 },
  { label: 'Trình chiếu', icon: 'projector', brightness: 20, colorTemp: 3500 },
];

// Đổi nhiệt độ màu (K) sang màu hiển thị gần đúng
function tempToColor(k) {
  const t = (k - 2700) / (6500 - 2700);
  const r = Math.round(255 - t * 55);
  const g = Math.round(190 + t * 40);
  const b = Math.round(110 + t * 145);
  return `rgb(${r},${g},${b})`;
}

export default function LightControl() {
  const { list, device, setSelectedId } = useDeviceOfType('light');
  const { updateDevice, toggleDevice, setAllOfType } = useOffice();
  if (!device) return <NoDevice type="light" />;

  const glow = tempToColor(device.colorTemp);
  const opacity = device.on ? 0.12 + (device.brightness / 100) * 0.3 : 0.06;

  return (
    <Screen title="Điều khiển đèn" subtitle={`${list.filter((d) => d.on).length}/${list.length} đèn đang bật`}>
      <DeviceChips list={list} device={device} onSelect={setSelectedId} color={colors.warning} />

      <Card style={styles.visual}>
        <View style={[styles.glow, { backgroundColor: glow, opacity }]} />
        <Icon name={device.on ? 'lightbulb-on' : 'lightbulb-outline'} size={110} color={device.on ? colors.warning : colors.border} />
        <Text style={styles.name}>{device.name}</Text>
        <Text style={styles.big}>{device.on ? `${device.brightness}%` : 'Tắt'}</Text>
        <View style={{ marginTop: 16 }}>
          <PowerButton on={device.on} color={colors.warning} onPress={() => toggleDevice(device.id)} />
        </View>
      </Card>

      <SectionTitle title="Độ sáng" />
      <Card>
        <View style={styles.sliderRow}>
          <Icon name="brightness-5" size={20} color={colors.muted} />
          <Slider
            style={{ flex: 1, marginHorizontal: 8 }}
            minimumValue={1}
            maximumValue={100}
            step={1}
            value={device.brightness}
            disabled={!device.on}
            minimumTrackTintColor={colors.warning}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.warning}
            onSlidingComplete={(v) => updateDevice(device.id, { brightness: Math.round(v) }, `Đặt độ sáng ${device.name} ${Math.round(v)}%`)}
          />
          <Icon name="brightness-7" size={24} color={colors.warning} />
        </View>
      </Card>

      <SectionTitle title={`Nhiệt độ màu · ${device.colorTemp}K`} />
      <Card>
        <View style={styles.sliderRow}>
          <Text style={styles.small}>Ấm</Text>
          <Slider
            style={{ flex: 1, marginHorizontal: 8 }}
            minimumValue={2700}
            maximumValue={6500}
            step={100}
            value={device.colorTemp}
            disabled={!device.on}
            minimumTrackTintColor="#FBBF24"
            maximumTrackTintColor="#BFDBFE"
            thumbTintColor={glow}
            onSlidingComplete={(v) => updateDevice(device.id, { colorTemp: Math.round(v) })}
          />
          <Text style={styles.small}>Lạnh</Text>
        </View>
      </Card>

      <SectionTitle title="Chế độ ánh sáng" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {PRESETS.map((p) => (
          <Chip
            key={p.label}
            label={p.label}
            icon={p.icon}
            color={colors.warning}
            active={device.on && device.brightness === p.brightness && device.colorTemp === p.colorTemp}
            onPress={() => updateDevice(device.id, { on: true, brightness: p.brightness, colorTemp: p.colorTemp }, `${device.name}: chế độ ${p.label}`)}
          />
        ))}
      </View>

      <SectionTitle title="Tất cả đèn" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button title="Bật tất cả" icon="lightbulb-group" style={{ flex: 1 }} onPress={() => setAllOfType('light', { on: true }, 'Bật tất cả đèn')} />
        <Button title="Tắt tất cả" variant="outline" icon="lightbulb-group-off-outline" style={{ flex: 1 }} onPress={() => setAllOfType('light', { on: false }, 'Tắt tất cả đèn')} />
      </View>
      <Text style={styles.info}>Công suất: {device.power} W · Chân PWM ESP32 điều khiển qua MOSFET/Relay</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  visual: { alignItems: 'center', paddingVertical: 28, overflow: 'hidden' },
  glow: { position: 'absolute', top: 10, width: 220, height: 220, borderRadius: 110 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 8 },
  big: { fontSize: 36, fontWeight: '800', color: colors.text },
  sliderRow: { flexDirection: 'row', alignItems: 'center' },
  small: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  info: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 18 },
});
