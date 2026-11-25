// Đặt phòng họp: lưu bền (AsyncStorage). Trước giờ họp 10 phút app tự bật đèn + điều hòa của phòng,
// hết giờ thì tự tắt (xem bộ đếm trong OfficeContext).
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Empty, Icon, Input, Screen, SectionTitle } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { MEETING_PREP_MIN, useOffice } from '../context/OfficeContext';
import { colors } from '../theme';
import { confirmAction } from '../utils/helpers';
import { addDays, dateKey, dateLabel, fromMin, hhmm, isValidTime, toMin } from '../utils/time';

const SLOTS = ['08:00', '08:30', '09:00', '10:00', '11:00', '13:30', '14:00', '14:30', '15:30', '16:30'];
const DURATIONS = [30, 60, 90, 120];

export default function Meeting() {
  const { user } = useAuth();
  const { rooms, devices, bookings, addBooking, removeBooking, can } = useOffice();
  const meetingRooms = rooms.filter((r) => /họp|giám đốc|meeting/i.test(r.name));
  const roomList = meetingRooms.length ? meetingRooms : rooms;
  const [roomId, setRoomId] = useState(roomList[0]?.id);
  const DATES = [dateKey(), addDays(1), addDays(2)];
  const [date, setDate] = useState(DATES[0]);
  const [slot, setSlot] = useState(null);
  const [custom, setCustom] = useState('');
  const [duration, setDuration] = useState(60);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const overlaps = (start, end) => bookings.some((b) => b.roomId === roomId && b.date === date && toMin(b.start) < end && toMin(b.end) > start);
  const isPast = (s) => date === dateKey() && toMin(s) <= toMin(hhmm());

  const book = () => {
    if (!slot) return setError('Chọn khung giờ hoặc nhập giờ bắt đầu');
    if (title.trim().length < 3) return setError('Nhập nội dung cuộc họp');
    const s = toMin(slot);
    const e = s + duration;
    if (e > 24 * 60) return setError('Cuộc họp vượt quá nửa đêm');
    if (overlaps(s, e)) return setError('Trùng với một lịch họp khác trong phòng này');
    if (addBooking({ roomId, date, start: slot, end: fromMin(e), title: title.trim(), host: user?.name })) {
      setSlot(null); setCustom(''); setTitle(''); setError('');
    }
    return undefined;
  };

  const sorted = [...bookings]
    .filter((b) => b.date >= dateKey())
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const roomDevs = (rid) => devices.filter((d) => d.roomId === rid && (d.type === 'light' || d.type === 'ac'));

  const statusOf = (b) => {
    const today = dateKey();
    const nowMin = toMin(hhmm());
    const ended = b.finished || b.date < today || (b.date === today && nowMin >= toMin(b.end));
    if (ended) return { text: 'Đã kết thúc', color: colors.muted };
    if (b.prepared) return { text: 'Đang diễn ra · thiết bị đã bật', color: colors.success };
    if (b.date === today && nowMin >= toMin(b.start)) return { text: 'Đang diễn ra', color: colors.success };
    return { text: `Tự bật ${roomDevs(b.roomId).length} thiết bị lúc ${fromMin(toMin(b.start) - MEETING_PREP_MIN)}`, color: colors.purple };
  };

  return (
    <Screen title="Đặt phòng họp" subtitle={`Tự bật đèn & điều hòa trước ${MEETING_PREP_MIN} phút, tắt khi kết thúc`}>
      {can('meeting.book') ? (
        <>
          <Text style={styles.label}>Phòng</Text>
          <View style={styles.wrap}>
            {roomList.map((r) => <Chip key={r.id} label={r.name} icon={r.icon} active={roomId === r.id} onPress={() => { setRoomId(r.id); setSlot(null); }} />)}
          </View>
          <Text style={styles.label}>Ngày</Text>
          <View style={styles.wrap}>
            {DATES.map((d) => <Chip key={d} label={dateLabel(d)} active={date === d} onPress={() => { setDate(d); setSlot(null); }} />)}
          </View>
          <Text style={styles.label}>Thời lượng</Text>
          <View style={styles.wrap}>
            {DURATIONS.map((m) => <Chip key={m} label={m < 60 ? `${m} phút` : `${m / 60} giờ`} active={duration === m} onPress={() => setDuration(m)} />)}
          </View>
          <Text style={styles.label}>Giờ bắt đầu</Text>
          <View style={styles.wrap}>
            {SLOTS.map((s) => {
              const busy = overlaps(toMin(s), toMin(s) + duration);
              const past = isPast(s);
              return (
                <Chip key={s} label={busy ? `${s} · Bận` : past ? `${s} · Đã qua` : s} active={slot === s} color={colors.purple}
                  onPress={() => { if (!busy && !past) { setSlot(s); setCustom(''); } }} icon={busy ? 'close' : undefined} />
              );
            })}
          </View>
          <Input label="Hoặc nhập giờ bắt đầu khác (HH:MM)" icon="clock-edit-outline" placeholder="VD: 19:15" value={custom}
            keyboardType="numbers-and-punctuation"
            onChangeText={(v) => {
              setCustom(v);
              setError('');
              const t = v.trim().padStart(5, '0');
              if (!isValidTime(t)) { setSlot(null); return; }
              if (isPast(t)) { setSlot(null); setError('Giờ này đã qua'); return; }
              setSlot(t);
            }} />
          <Input label="Nội dung cuộc họp" icon="text" placeholder="VD: Họp kế hoạch quý" value={title} onChangeText={setTitle} error={error} autoCapitalize="sentences" />
          <Button title="Đặt phòng" icon="calendar-check" onPress={book} />
        </>
      ) : (
        <Card><Text style={{ color: colors.muted }}>Tài khoản Khách chỉ xem được lịch họp.</Text></Card>
      )}

      <SectionTitle title="Lịch sắp tới" />
      {sorted.length ? sorted.map((b) => {
        const room = rooms.find((r) => r.id === b.roomId);
        const st = statusOf(b);
        return (
          <Card key={b.id} style={styles.item}>
            <View style={styles.timeBox}>
              <Text style={styles.timeText}>{b.start}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>{b.end}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{b.title}</Text>
              <Text style={styles.sub}>{room?.name || 'Phòng đã xóa'} · {dateLabel(b.date)}</Text>
              <Text style={styles.sub}>Chủ trì: {b.host}</Text>
              <Text style={[styles.sub, { color: st.color, fontWeight: '600' }]}>{st.text}</Text>
            </View>
            <Icon name="trash-can-outline" size={22} color={colors.danger} onPress={() => confirmAction('Hủy lịch họp này?', () => removeBooking(b.id), 'Hủy lịch')} />
          </Card>
        );
      }) : <Empty icon="calendar-blank" text="Chưa có lịch họp" />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8, marginTop: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, padding: 14 },
  timeBox: { width: 64, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border, marginRight: 12 },
  timeText: { fontSize: 16, fontWeight: '800', color: colors.purple },
  title: { fontWeight: '700', color: colors.text },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
