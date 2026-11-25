// Giám sát môi trường từ cảm biến (DHT22, MQ-2, BH1750, MH-Z19, PIR)
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart, Card, Icon, ProgressBar, Screen, SectionTitle, Segmented } from '../components/ui';
import { useOffice, useTemp } from '../context/OfficeContext';
import { colors } from '../theme';

const SENSORS = [
  { key: 'temperature', label: 'Nhiệt độ', unit: '°C', icon: 'thermometer', color: colors.danger, max: 40, sensor: 'DHT22', good: (v) => v >= 20 && v <= 30 },
  { key: 'humidity', label: 'Độ ẩm', unit: '%', icon: 'water-percent', color: colors.info, max: 100, sensor: 'DHT22', good: (v) => v >= 40 && v <= 70 },
  { key: 'gas', label: 'Khí gas', unit: 'ppm', icon: 'gas-cylinder', color: colors.warning, max: 1000, sensor: 'MQ-2', good: (v) => v < 300 },
  { key: 'co2', label: 'CO₂', unit: 'ppm', icon: 'molecule-co2', color: colors.success, max: 2000, sensor: 'MH-Z19', good: (v) => v < 1000 },
  { key: 'light', label: 'Ánh sáng', unit: 'lux', icon: 'white-balance-sunny', color: '#EAB308', max: 1000, sensor: 'BH1750', good: (v) => v >= 300 },
];

export default function Sensors() {
  const { sensors, sensorHistory, connected, settings } = useOffice();
  const { unit, val } = useTemp();
  const [chart, setChart] = useState('temperature');
  // Nhiệt độ hiển thị theo đơn vị đã chọn (ngưỡng đánh giá vẫn tính bằng °C)
  const show = (key, v) => (key === 'temperature' ? val(v) : v);
  const unitOf = (x) => (x.key === 'temperature' ? `°${unit}` : x.unit);
  const s = SENSORS.find((x) => x.key === chart);
  const data = sensorHistory.slice(-8).map((h) => ({ t: h.t, v: show(chart, h[chart]) }));

  return (
    <Screen title="Cảm biến môi trường" subtitle={settings.mockMode ? 'Dữ liệu mô phỏng · cập nhật 5 giây' : connected ? 'Đang nhận dữ liệu từ ESP32' : 'Mất kết nối ESP32'}>
      <View style={styles.grid}>
        {SENSORS.map((x) => {
          const v = sensors[x.key];
          const ok = x.good(v);
          return (
            <Card key={x.key} style={styles.card} onPress={() => setChart(x.key)}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: x.color + '1A' }]}><Icon name={x.icon} size={22} color={x.color} /></View>
                <View style={[styles.badge, { backgroundColor: (ok ? colors.success : colors.danger) + '1A' }]}>
                  <Text style={{ color: ok ? colors.success : colors.danger, fontSize: 10, fontWeight: '700' }}>{ok ? 'Tốt' : 'Cảnh báo'}</Text>
                </View>
              </View>
              <Text style={styles.val}>{show(x.key, v)}<Text style={styles.unit}> {unitOf(x)}</Text></Text>
              <Text style={styles.label}>{x.label} · {x.sensor}</Text>
              <View style={{ marginTop: 8 }}><ProgressBar value={Number(v) || 0} max={x.max} color={x.color} height={6} /></View>
            </Card>
          );
        })}
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: colors.purple + '1A' }]}><Icon name="motion-sensor" size={22} color={colors.purple} /></View>
          </View>
          <Text style={[styles.val, { fontSize: 18 }]}>{sensors.motion ? 'Có người' : 'Không có'}</Text>
          <Text style={styles.label}>Chuyển động · PIR HC-SR501</Text>
        </Card>
      </View>

      <SectionTitle title="Biểu đồ theo thời gian" />
      <Segmented
        value={chart}
        onChange={setChart}
        color={s.color}
        options={SENSORS.slice(0, 4).map((x) => ({ value: x.key, label: x.label }))}
      />
      <Card style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 8 }}>{s.label} ({unitOf(s)}) — {data.length} lần đo gần nhất</Text>
        {data.length > 1 ? <BarChart data={data} valueKey="v" labelKey="t" color={s.color} /> : <Text style={{ color: colors.muted }}>Đang thu thập dữ liệu...</Text>}
      </Card>

      <SectionTitle title="Chất lượng không khí" />
      <Card>
        <AirQuality co2={sensors.co2} gas={sensors.gas} />
      </Card>
    </Screen>
  );
}

function AirQuality({ co2, gas }) {
  const score = Math.max(0, Math.min(100, Math.round(100 - (co2 - 400) / 16 - (gas - 100) / 8)));
  const [label, color] = score > 75 ? ['Tốt', colors.success] : score > 50 ? ['Trung bình', colors.warning] : ['Kém', colors.danger];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={[styles.aqi, { borderColor: color }]}>
        <Text style={{ fontSize: 26, fontWeight: '800', color }}>{score}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color }}>{label}</Text>
        <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 18 }}>
          {score > 75 ? 'Không khí trong lành, phù hợp làm việc.' : score > 50 ? 'Nên mở cửa sổ hoặc bật quạt thông gió.' : 'Cần thông gió ngay, kiểm tra nguồn khí gas!'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', marginBottom: 12, padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  val: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 10 },
  unit: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  label: { fontSize: 12, color: colors.muted, marginTop: 2 },
  aqi: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
});
