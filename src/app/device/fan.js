// Điều khiển quạt: tốc độ, chế độ gió, đảo chiều, hẹn giờ tắt
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { DeviceChips, NoDevice, useDeviceOfType } from '../../components/DevicePicker';
import { Card, Chip, Icon, PowerButton, Screen, SectionTitle, Segmented } from '../../components/ui';
import { useOffice } from '../../context/OfficeContext';
import { colors } from '../../theme';

const MODES = [
  { value: 'normal', label: 'Thường', icon: 'weather-windy' },
  { value: 'natural', label: 'Tự nhiên', icon: 'leaf' },
  { value: 'sleep', label: 'Ngủ', icon: 'power-sleep' },
];
const TIMERS = [0, 1, 15, 30, 60, 120]; // 1 phút để demo nhanh

export default function FanControl() {
  const { list, device, setSelectedId } = useDeviceOfType('fan');
  const { updateDevice, toggleDevice, setFanTimer } = useOffice();
  const [spin] = useState(() => new Animated.Value(0));
  const [now, setNow] = useState(() => Date.now());

  // Cập nhật thời gian còn lại của hẹn giờ tắt mỗi giây
  useEffect(() => {
    if (!device?.timerEnd) return undefined;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [device?.timerEnd]);

  const running = device?.on;
  const speed = device?.speed || 1;

  // Cánh quạt quay nhanh/chậm theo tốc độ
  useEffect(() => {
    spin.stopAnimation();
    spin.setValue(0);
    if (!running) return undefined;
    const anim = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: [0, 1400, 800, 400][speed], easing: Easing.linear, useNativeDriver: true }),
    );
    anim.start();
    return () => anim.stop();
  }, [running, speed, spin]);

  if (!device) return <NoDevice type="fan" />;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const left = device.timerEnd ? Math.max(0, Math.round((device.timerEnd - now) / 1000)) : 0;
  const leftText = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;

  return (
    <Screen title="Điều khiển quạt" subtitle={`${list.filter((d) => d.on).length}/${list.length} quạt đang chạy`}>
      <DeviceChips list={list} device={device} onSelect={setSelectedId} color={colors.info} />

      <Card style={styles.visual}>
        <View style={[styles.ring, device.on && { borderColor: colors.info + '55' }]}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Icon name="fan" size={130} color={device.on ? colors.info : colors.border} />
          </Animated.View>
        </View>
        <Text style={styles.name}>{device.name}</Text>
        <Text style={styles.status}>{device.on ? `Tốc độ ${device.speed} · ${MODES.find((m) => m.value === device.mode)?.label}` : 'Đang tắt'}</Text>
        {device.timerEnd && device.on ? <Text style={styles.timer}>⏱ Tự tắt sau {leftText}</Text> : null}
        <View style={{ marginTop: 16 }}>
          <PowerButton on={device.on} color={colors.info} onPress={() => toggleDevice(device.id)} />
        </View>
      </Card>

      <SectionTitle title="Tốc độ gió" />
      <View style={styles.speedRow}>
        {[1, 2, 3].map((s) => (
          <Pressable
            key={s}
            onPress={() => updateDevice(device.id, { speed: s, on: true }, `${device.name}: tốc độ ${s}`)}
            style={[styles.speed, device.on && device.speed === s && styles.speedOn]}
          >
            <Text style={[styles.speedNum, device.on && device.speed === s && { color: '#fff' }]}>{s}</Text>
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              {[1, 2, 3].map((b) => (
                <View key={b} style={[styles.bar, { height: 6 + b * 4 }, b <= s && { backgroundColor: device.on && device.speed === s ? '#fff' : colors.info }]} />
              ))}
            </View>
          </Pressable>
        ))}
      </View>

      <SectionTitle title="Chế độ" />
      <Segmented options={MODES} value={device.mode} color={colors.info} onChange={(v) => updateDevice(device.id, { mode: v }, `${device.name}: chế độ ${MODES.find((m) => m.value === v).label}`)} />

      <SectionTitle title="Tùy chọn" />
      <Card>
        <View style={styles.optRow}>
          <Icon name="arrow-left-right" size={22} color={colors.info} />
          <Text style={styles.opt}>Đảo chiều (xoay)</Text>
          <Switch value={device.swing} onValueChange={(v) => updateDevice(device.id, { swing: v })} trackColor={{ true: colors.info }} thumbColor="#fff" activeThumbColor="#fff" />
        </View>
      </Card>

      <SectionTitle title="Hẹn giờ tắt" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {TIMERS.map((t) => (
          <Chip key={t} label={t === 0 ? 'Không' : t < 60 ? `${t} phút` : `${t / 60} giờ`} color={colors.info}
            active={(device.timerEnd ? device.timer : 0) === t}
            onPress={() => setFanTimer(device.id, t)} />
        ))}
      </View>
      {!device.on && device.timerEnd ? <Text style={styles.info}>Quạt đang tắt, hẹn giờ sẽ tự hủy khi hết thời gian.</Text> : null}
      <Text style={styles.info}>Bộ đếm chạy trong app: khi hết giờ app gửi lệnh tắt xuống ESP32.</Text>
      <Text style={styles.info}>Công suất: {device.power} W · Điều khiển qua module Relay / Triac</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  visual: { alignItems: 'center', paddingVertical: 24 },
  ring: { width: 190, height: 190, borderRadius: 95, borderWidth: 10, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 12 },
  status: { color: colors.muted, marginTop: 4 },
  timer: { color: colors.info, marginTop: 6, fontWeight: '600' },
  speedRow: { flexDirection: 'row', gap: 12 },
  speed: { flex: 1, alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: colors.border },
  speedOn: { backgroundColor: colors.info, borderColor: colors.info },
  speedNum: { fontSize: 24, fontWeight: '800', color: colors.text },
  bar: { width: 6, borderRadius: 3, marginHorizontal: 2, backgroundColor: colors.border, alignSelf: 'flex-end' },
  optRow: { flexDirection: 'row', alignItems: 'center' },
  opt: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600', color: colors.text },
  info: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 18 },
});
