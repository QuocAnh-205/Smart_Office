// Chấm công bằng thẻ RFID (module RC522). Dữ liệu lưu bền trong OfficeContext.
// Quẹt thẻ trên mạch ESP32/Wokwi -> MQTT topic <base>/rfid (hoặc GET /api/events khi dùng HTTP) -> handleRfid
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Card, Chip, Icon, Screen, SectionTitle, StatCard } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useOffice } from '../context/OfficeContext';
import { colors } from '../theme';
import { addDays, dateKey, dateLabel } from '../utils/time';

const STATUS = {
  ontime: { label: 'Đúng giờ', color: colors.success },
  late: { label: 'Đi muộn', color: colors.warning },
  absent: { label: 'Vắng', color: colors.danger },
};

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default function Attendance() {
  const { users } = useAuth();
  const { attendance, handleRfid, can, settings } = useOffice();
  const [day, setDay] = useState(dateKey());
  const [lastScan, setLastScan] = useState(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(-i));
  const members = users.filter((u) => u.card);

  const rows = members.map((u) => {
    const r = attendance.find((a) => a.userId === u.id && a.date === day);
    return { user: u, rec: r, status: r?.checkIn ? r.status : 'absent' };
  });
  const count = (s) => rows.filter((x) => x.status === s).length;

  const simulate = (unknown) => {
    const uid = unknown ? 'DE:AD:BE:EF' : pickRandom(members)?.card;
    if (!uid) return;
    const r = handleRfid(uid, { source: 'app' });
    setDay(dateKey());
    setLastScan(r.ok ? { ok: true, text: `${r.user.name} · ${r.kind} lúc ${r.time}${r.opened ? ' · cửa chính đã mở' : ''}`, uid } : { ok: false, text: 'Thẻ lạ bị từ chối, cửa không mở', uid });
  };

  return (
    <Screen title="Chấm công RFID" subtitle={`${dateLabel(day)} · ${members.length} thẻ đã đăng ký`}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatCard icon="account-check" label="Đúng giờ" value={count('ontime')} color={colors.success} />
        <StatCard icon="account-clock" label="Đi muộn" value={count('late')} color={colors.warning} />
        <StatCard icon="account-off" label="Vắng" value={count('absent')} color={colors.danger} />
      </View>

      <Card style={styles.scanner}>
        <Icon name="contactless-payment-circle-outline" size={70} color={colors.primary} />
        {lastScan ? (
          <Text style={[styles.scanText, { color: lastScan.ok ? colors.text : colors.danger }]}>
            {lastScan.ok ? '✅' : '⛔'} {lastScan.text}{'\n'}<Text style={{ color: colors.muted, fontSize: 12 }}>UID: {lastScan.uid}</Text>
          </Text>
        ) : (
          <Text style={styles.scanText}>
            {settings.mockMode
              ? 'Chế độ mô phỏng: bấm nút bên dưới để giả lập quẹt thẻ.'
              : 'Đầu đọc RC522 trên ESP32 sẵn sàng. Quẹt thẻ tại cửa, kết quả hiện ở đây ngay.'}
          </Text>
        )}
        {can('attendance.manage') ? (
          <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 12 }}>
            <Button title="Quẹt thẻ NV" icon="card-account-details-outline" variant="outline" onPress={() => simulate(false)} style={{ flex: 1 }} />
            <Button title="Thẻ lạ" icon="card-remove-outline" variant="outline" onPress={() => simulate(true)} style={{ flex: 1 }} />
          </View>
        ) : null}
        <Text style={styles.rule}>Vào sau 08:05 tính là đi muộn · lần quẹt đầu là Vào, các lần sau cập nhật giờ Ra</Text>
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 18 }}>
        {days.map((d) => <Chip key={d} label={dateLabel(d)} active={day === d} onPress={() => setDay(d)} />)}
      </ScrollView>

      <SectionTitle title="Bảng chấm công" style={{ marginTop: 10 }} />
      {rows.map(({ user: u, rec, status }) => {
        const s = STATUS[status];
        return (
          <Card key={u.id} style={styles.item}>
            <Avatar name={u.name} size={44} color={s.color} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.name}>{u.name}</Text>
              <Text style={styles.sub}>{u.role} · Thẻ {u.card}</Text>
              <Text style={styles.sub}>Vào {rec?.checkIn || '--:--'} · Ra {rec?.checkOut || '--:--'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: s.color + '1A' }]}>
              <Text style={{ color: s.color, fontWeight: '700', fontSize: 11 }}>{s.label}</Text>
            </View>
          </Card>
        );
      })}
      {users.length > members.length ? (
        <Text style={styles.rule}>{users.length - members.length} tài khoản chưa được gán thẻ (gán trong mục Thành viên).</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scanner: { alignItems: 'center', marginTop: 16, paddingVertical: 20 },
  scanText: { textAlign: 'center', color: colors.text, marginTop: 8, fontWeight: '600', lineHeight: 22 },
  rule: { color: colors.muted, fontSize: 11, marginTop: 10, textAlign: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, padding: 14 },
  name: { fontWeight: '700', color: colors.text },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
});
