// Thống kê điện năng tiêu thụ
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart, Card, Icon, ProgressBar, Screen, SectionTitle, Segmented, StatCard } from '../components/ui';
import { useOffice } from '../context/OfficeContext';
import { ENERGY_WEEK } from '../data/mock';
import { colors, DEVICE_META } from '../theme';

const PRICE = 2500; // đ/kWh (tham khảo)
const MONTH = [
  { day: 'T6', kwh: 410 }, { day: 'T7', kwh: 455 }, { day: 'T8', kwh: 498 },
  { day: 'T9', kwh: 430 }, { day: 'T10', kwh: 402 }, { day: 'T11', kwh: 268 },
];

export default function Energy() {
  const { devices, stats } = useOffice();
  const [range, setRange] = useState('week');
  const data = range === 'week' ? ENERGY_WEEK : MONTH;
  const total = data.reduce((s, d) => s + d.kwh, 0);

  // Công suất đang dùng theo loại thiết bị
  const byType = Object.keys(DEVICE_META).map((t) => ({
    type: t,
    w: devices.filter((d) => d.type === t && d.on).reduce((s, d) => s + (d.power || 0), 0),
  })).filter((x) => x.w > 0).sort((a, b) => b.w - a.w);
  const maxW = Math.max(...byType.map((x) => x.w), 1);

  return (
    <Screen title="Điện năng" subtitle="Theo dõi mức tiêu thụ (cảm biến PZEM-004T)">
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatCard icon="lightning-bolt" label="Đang tiêu thụ" value={(stats.powerNow / 1000).toFixed(2)} unit="kW" color={colors.warning} />
        <StatCard icon="cash" label={range === 'week' ? 'Chi phí tuần' : 'Chi phí 6 tháng'} value={(total * PRICE / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} unit="K đ" color={colors.success} />
      </View>

      <SectionTitle title="Biểu đồ tiêu thụ" />
      <Segmented value={range} onChange={setRange} options={[{ value: 'week', label: '7 ngày' }, { value: 'month', label: '6 tháng' }]} color={colors.warning} />
      <Card style={{ marginTop: 12 }}>
        <Text style={styles.total}>{total.toFixed(1)} kWh</Text>
        <Text style={{ color: colors.muted, marginBottom: 10 }}>Tổng {range === 'week' ? 'tuần này' : '6 tháng gần nhất'}</Text>
        <BarChart data={data} valueKey="kwh" labelKey="day" color={colors.warning} />
      </Card>

      <SectionTitle title="Theo loại thiết bị (hiện tại)" />
      <Card>
        {byType.length ? byType.map((x) => {
          const m = DEVICE_META[x.type];
          return (
            <View key={x.type} style={styles.row}>
              <Icon name={m.icon} size={22} color={m.color} />
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontWeight: '600', color: colors.text }}>{m.label}</Text>
                  <Text style={{ color: colors.muted }}>{x.w} W</Text>
                </View>
                <ProgressBar value={x.w} max={maxW} color={m.color} />
              </View>
            </View>
          );
        }) : <Text style={{ color: colors.muted }}>Không có thiết bị nào đang bật</Text>}
      </Card>

      <SectionTitle title="Gợi ý tiết kiệm" />
      <Card>
        {[
          'Đặt điều hòa ở 26°C giúp tiết kiệm ~15% điện năng.',
          'Dùng ngữ cảnh "Tan làm" để tắt toàn bộ thiết bị khi về.',
          'Bật chế độ Tiết kiệm cho tủ đông vào cuối tuần.',
        ].map((t) => (
          <View key={t} style={{ flexDirection: 'row', marginBottom: 10 }}>
            <Icon name="leaf" size={18} color={colors.success} />
            <Text style={{ flex: 1, marginLeft: 8, color: colors.text, lineHeight: 20 }}>{t}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  total: { fontSize: 28, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
});
