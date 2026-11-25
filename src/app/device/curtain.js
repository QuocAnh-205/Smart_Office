// Điều khiển rèm cửa (động cơ bước / servo)
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { DeviceChips, NoDevice, useDeviceOfType } from '../../components/DevicePicker';
import { Button, Card, Chip, Icon, PowerButton, Screen, SectionTitle } from '../../components/ui';
import { useOffice } from '../../context/OfficeContext';
import { colors } from '../../theme';

const COLOR = '#8B5CF6';

export default function CurtainControl() {
  const { list, device, setSelectedId } = useDeviceOfType('curtain');
  const { updateDevice, toggleDevice } = useOffice();
  if (!device) return <NoDevice type="curtain" />;

  const setPos = (p) => updateDevice(device.id, { position: p, on: true }, `${device.name}: mở ${p}%`);
  const panel = (100 - device.position) / 2; // % chiều rộng mỗi tấm rèm còn che

  return (
    <Screen title="Rèm cửa" subtitle={device.name}>
      <DeviceChips list={list} device={device} onSelect={setSelectedId} color={COLOR} />
      <Card style={styles.visual}>
        <View style={styles.window}>
          <View style={styles.sky}><Icon name="weather-partly-cloudy" size={60} color="#fff" /></View>
          <View style={[styles.panel, { left: 0, width: `${Math.max(panel, 6)}%` }]} />
          <View style={[styles.panel, { right: 0, width: `${Math.max(panel, 6)}%` }]} />
          <View style={styles.rod} />
        </View>
        <Text style={styles.big}>{device.position}%</Text>
        <Text style={styles.small}>{device.position === 0 ? 'Đóng hoàn toàn' : device.position === 100 ? 'Mở hoàn toàn' : 'Mở một phần'}</Text>
        <View style={{ marginTop: 12 }}><PowerButton on={device.on} color={COLOR} onPress={() => toggleDevice(device.id)} /></View>
      </Card>

      <SectionTitle title="Độ mở" />
      <Card>
        <Slider
          minimumValue={0}
          maximumValue={100}
          step={5}
          value={device.position}
          disabled={!device.on}
          minimumTrackTintColor={COLOR}
          maximumTrackTintColor={colors.border}
          thumbTintColor={COLOR}
          onSlidingComplete={(v) => setPos(Math.round(v))}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
          {[0, 25, 50, 75, 100].map((p) => <Chip key={p} label={`${p}%`} color={COLOR} active={device.position === p} onPress={() => setPos(p)} />)}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
        <Button title="Mở hết" icon="arrow-expand-horizontal" style={{ flex: 1 }} onPress={() => setPos(100)} />
        <Button title="Đóng hết" variant="outline" icon="arrow-collapse-horizontal" style={{ flex: 1 }} onPress={() => setPos(0)} />
      </View>
      <Text style={styles.note}>Gợi ý: tự đóng rèm khi cảm biến ánh sáng (LDR/BH1750) đo &gt; 800 lux.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  visual: { alignItems: 'center', paddingVertical: 20 },
  window: { width: '90%', height: 180, borderRadius: 14, overflow: 'hidden', borderWidth: 6, borderColor: '#E5E7EB' },
  sky: { flex: 1, backgroundColor: '#7DD3FC', alignItems: 'center', justifyContent: 'center' },
  panel: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#A78BFA' },
  rod: { position: 'absolute', top: 0, left: 0, right: 0, height: 8, backgroundColor: '#6D28D9' },
  big: { fontSize: 36, fontWeight: '800', color: colors.text, marginTop: 14 },
  small: { color: colors.muted },
  note: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 18 },
});
