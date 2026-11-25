// Màn hình chính (Dashboard)
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import DeviceTile from '../../components/DeviceTile';
import { Avatar, Card, Chip, Icon, IconButton, Screen, SectionTitle } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useOffice, useTemp } from '../../context/OfficeContext';
import { colors, DEVICE_META, gradients, radius } from '../../theme';

const QUICK = [
  { key: 'light', label: 'Đèn' },
  { key: 'fan', label: 'Quạt' },
  { key: 'ac', label: 'Điều hòa' },
  { key: 'freezer', label: 'Tủ đông' },
  { key: 'door', label: 'Khóa cửa' },
  { key: 'curtain', label: 'Rèm' },
  { key: 'camera', label: 'Camera' },
];

const FEATURES = [
  { icon: 'thermometer-lines', label: 'Cảm biến', color: colors.danger, href: '/sensors' },
  { icon: 'lightning-bolt-outline', label: 'Điện năng', color: colors.warning, href: '/energy' },
  { icon: 'calendar-clock', label: 'Hẹn giờ', color: colors.info, href: '/schedule' },
  { icon: 'card-account-details-outline', label: 'Chấm công', color: colors.success, href: '/attendance' },
  { icon: 'calendar-account-outline', label: 'Đặt phòng họp', color: colors.purple, href: '/meeting' },
  { icon: 'history', label: 'Lịch sử', color: colors.pink, href: '/history' },
  { icon: 'devices', label: 'Thiết bị', color: colors.primary, href: '/devices' },
  { icon: 'account-group-outline', label: 'Thành viên', color: '#0EA5E9', href: '/members' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export default function Home() {
  const { user } = useAuth();
  const { devices, rooms, sensors, stats, scenes, runScene, connected, settings } = useOffice();
  const { fmt } = useTemp();
  const [roomFilter, setRoomFilter] = useState('all');

  const shown = useMemo(
    () => (roomFilter === 'all' ? devices : devices.filter((d) => d.roomId === roomFilter)).slice(0, roomFilter === 'all' ? 6 : 50),
    [devices, roomFilter],
  );

  return (
    <Screen>
      {/* Lời chào */}
      <View style={styles.top}>
        <Pressable onPress={() => router.push('/profile')} style={{ marginRight: 12 }}>
          <Avatar name={user?.name} size={46} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>{greeting()} 👋</Text>
          <Text style={styles.name} numberOfLines={1}>{user?.name}</Text>
        </View>
        <IconButton icon="magnify" onPress={() => router.push('/devices')} />
        <View style={{ width: 10 }} />
        <IconButton icon="bell-outline" badge={stats.unread} onPress={() => router.push('/notifications')} />
      </View>

      {/* Thẻ môi trường */}
      <Pressable onPress={() => router.push('/sensors')}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={[styles.blob, { width: 180, height: 180, top: -60, right: -40 }]} />
          <View style={[styles.blob, { width: 120, height: 120, bottom: -50, left: -30 }]} />
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Icon name="weather-partly-cloudy" size={40} color="#FDE68A" style={{ marginRight: 8 }} />
                <Text style={styles.heroTemp}>{fmt(sensors.temperature, false)}</Text>
              </View>
              <Text style={styles.heroLabel}>Nhiệt độ trong văn phòng</Text>
            </View>
            <View style={styles.connPill}>
              <View style={[styles.connDot, { backgroundColor: connected ? '#4ADE80' : '#F87171' }]} />
              <Text style={styles.connText}>{settings.mockMode ? 'Mô phỏng' : connected ? 'ESP32 online' : 'Mất kết nối'}</Text>
            </View>
          </View>
          <View style={styles.heroRow}>
            <HeroStat icon="water-percent" value={`${sensors.humidity}%`} label="Độ ẩm" />
            <HeroStat icon="molecule-co2" value={sensors.co2} label="CO₂ ppm" />
            <HeroStat icon="gas-cylinder" value={sensors.gas} label="Gas ppm" warn={sensors.gas > 400} />
            <HeroStat icon="white-balance-sunny" value={sensors.light} label="Lux" />
          </View>
        </LinearGradient>
      </Pressable>

      {/* Tổng quan */}
      <View style={styles.statsRow}>
        <MiniStat icon="power-plug-outline" color={colors.success} value={`${stats.active}/${stats.total}`} label="Đang bật" />
        <MiniStat icon="lightning-bolt" color={colors.warning} value={`${(stats.powerNow / 1000).toFixed(2)}`} label="kW hiện tại" />
        <MiniStat icon="lock-outline" color={colors.primary} value={stats.lockedDoors} label="Cửa đã khóa" />
      </View>

      {/* Điều khiển nhanh theo loại */}
      <SectionTitle title="Điều khiển nhanh" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {QUICK.map((q) => {
          const meta = DEVICE_META[q.key];
          const count = devices.filter((d) => d.type === q.key).length;
          return (
            <Pressable key={q.key} style={styles.quick} onPress={() => router.push(meta.route)}>
              <LinearGradient colors={meta.gradient} style={styles.quickIcon}>
                <Icon name={meta.icon} size={28} color="#fff" />
              </LinearGradient>
              <Text style={styles.quickLabel}>{q.label}</Text>
              <Text style={styles.quickCount}>{count} thiết bị</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Ngữ cảnh */}
      <SectionTitle title="Ngữ cảnh" action="Xem tất cả" onAction={() => router.push('/automation')} />
      <View style={styles.sceneGrid}>
        {scenes.slice(0, 4).map((s) => (
          <Card key={s.id} style={styles.scene} onPress={() => runScene(s)}>
            <View style={[styles.sceneIcon, { backgroundColor: s.color + '20' }]}>
              <Icon name={s.icon} size={22} color={s.color} />
            </View>
            <Text style={styles.sceneName} numberOfLines={2}>{s.name}</Text>
          </Card>
        ))}
      </View>

      {/* Tiện ích */}
      <SectionTitle title="Tiện ích" />
      <Card style={styles.features}>
        {FEATURES.map((f) => (
          <Pressable key={f.href} style={styles.feature} onPress={() => router.push(f.href)}>
            <View style={[styles.featureIcon, { backgroundColor: f.color + '18' }]}>
              <Icon name={f.icon} size={24} color={f.color} />
            </View>
            <Text style={styles.featureLabel} numberOfLines={2}>{f.label}</Text>
          </Pressable>
        ))}
      </Card>

      {/* Thiết bị */}
      <SectionTitle title="Thiết bị" action="Tất cả" onAction={() => router.push('/devices')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
        <Chip label="Tất cả" active={roomFilter === 'all'} onPress={() => setRoomFilter('all')} />
        {rooms.map((r) => (
          <Chip key={r.id} label={r.name} active={roomFilter === r.id} onPress={() => setRoomFilter(r.id)} />
        ))}
      </ScrollView>
      <View style={styles.grid}>
        {shown.map((d) => <DeviceTile key={d.id} device={d} />)}
      </View>
    </Screen>
  );
}

function HeroStat({ icon, value, label, warn }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Icon name={icon} size={20} color={warn ? '#FCA5A5' : '#fff'} />
      <Text style={styles.heroStatVal}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function MiniStat({ icon, color, value, label }) {
  return (
    <Card style={styles.mini}>
      <Icon name={icon} size={20} color={color} />
      <Text style={styles.miniVal}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  hello: { color: colors.muted, fontSize: 14 },
  name: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 1, letterSpacing: -0.3 },
  hero: { borderRadius: radius.xl, padding: 20, overflow: 'hidden', boxShadow: '0px 16px 36px rgba(99, 102, 241, 0.35)' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  heroTemp: { color: '#fff', fontSize: 48, fontWeight: '800', letterSpacing: -1.5 },
  connPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  connDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  connText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heroRow: { flexDirection: 'row', marginTop: 18, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.md, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  heroStatVal: { color: '#fff', fontWeight: '700', fontSize: 15, marginTop: 4 },
  heroStatLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  mini: { flex: 1, padding: 12, alignItems: 'flex-start' },
  miniVal: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 6 },
  miniLabel: { fontSize: 11, color: colors.muted },
  quick: { alignItems: 'center', marginRight: 14, width: 78 },
  quickIcon: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 8px 18px rgba(15, 23, 42, 0.12)' },
  quickLabel: { fontWeight: '700', color: colors.text, marginTop: 8, fontSize: 13 },
  quickCount: { fontSize: 11, color: colors.muted },
  sceneGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  scene: { width: '48%', flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 10 },
  sceneIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  sceneName: { flex: 1, fontWeight: '600', color: colors.text, fontSize: 13 },
  features: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 8, paddingHorizontal: 4 },
  feature: { width: '25%', alignItems: 'center', paddingVertical: 10 },
  featureIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { fontSize: 12, color: colors.text, marginTop: 6, textAlign: 'center', fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
