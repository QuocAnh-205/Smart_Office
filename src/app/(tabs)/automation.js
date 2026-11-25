// Ngữ cảnh + quy tắc tự động hóa + hẹn giờ
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Empty, Icon, IconButton, Screen, Segmented } from '../../components/ui';
import { useOffice } from '../../context/OfficeContext';
import { colors, DEVICE_META } from '../../theme';
import { actionText, triggerText } from '../../utils/automation';
import { confirmAction, DAY_LABELS, describeAction } from '../../utils/helpers';
import { hhmm } from '../../utils/time';

const DAY = DAY_LABELS;
const confirm = confirmAction;

export default function Automation() {
  const [tab, setTab] = useState('scene');
  const o = useOffice();

  const addRoute = { scene: '/add-scene', rule: '/add-automation', schedule: '/schedule' }[tab];
  const admin = o.can('automation.manage');
  const unit = o.settings.tempUnit;

  return (
    <Screen title="Tự động hóa" subtitle="Ngữ cảnh, quy tắc và hẹn giờ" back={false}
      right={admin ? <IconButton icon="plus" color="#fff" bg={colors.primary} onPress={() => router.push(addRoute)} /> : null}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'scene', label: 'Ngữ cảnh', icon: 'palette-outline' },
          { value: 'rule', label: 'Quy tắc', icon: 'robot-outline' },
          { value: 'schedule', label: 'Hẹn giờ', icon: 'clock-outline' },
        ]}
      />
      <View style={{ height: 16 }} />

      {tab === 'scene' && (o.scenes.length ? o.scenes.map((s) => (
        <Card key={s.id} style={styles.item}>
          <View style={[styles.icon, { backgroundColor: s.color + '20' }]}><Icon name={s.icon} size={26} color={s.color} /></View>
          <Pressable style={{ flex: 1 }} onLongPress={admin ? () => confirm(`Xóa ngữ cảnh "${s.name}"?`, () => o.removeScene(s.id)) : undefined}>
            <Text style={styles.title}>{s.name}</Text>
            <View style={{ flexDirection: 'row', marginTop: 6, flexWrap: 'wrap' }}>
              {s.actions.map((a, i) => (
                <View key={i} style={styles.tag}>
                  <Icon name={DEVICE_META[a.type].icon} size={12} color={colors.muted} />
                  <Text style={styles.tagText}>{describeAction(a)}</Text>
                </View>
              ))}
            </View>
          </Pressable>
          <Pressable style={[styles.run, { backgroundColor: s.color }]} onPress={() => o.runScene(s)}>
            <Icon name="play" size={20} color="#fff" />
          </Pressable>
        </Card>
      )) : <Empty icon="palette-outline" text="Chưa có ngữ cảnh nào" />)}

      {tab === 'rule' && (o.automations.length ? o.automations.map((a) => (
        <Card key={a.id} style={styles.item}>
          <View style={[styles.icon, { backgroundColor: colors.primaryLight }]}><Icon name={a.icon} size={24} color={colors.primary} /></View>
          <Pressable style={{ flex: 1 }} onLongPress={admin ? () => confirm(`Xóa quy tắc "${a.name}"?`, () => o.removeAutomation(a.id)) : undefined}>
            <Text style={styles.title}>{a.name}</Text>
            <Text style={styles.sub}>NẾU: {a.cond ? triggerText(a.cond, unit) : a.trigger}</Text>
            <Text style={styles.sub}>THÌ: {a.act ? actionText(a.act, o.rooms) : a.action}</Text>
            {a.lastRun ? <Text style={styles.ran}>✓ Đã chạy lúc {hhmm(new Date(a.lastRun))} {new Date(a.lastRun).toLocaleDateString('vi-VN')}</Text> : null}
          </Pressable>
          <Switch value={a.enabled} disabled={!admin} onValueChange={() => o.toggleAutomation(a.id)} trackColor={{ true: colors.primary }} thumbColor="#fff" activeThumbColor="#fff" />
        </Card>
      )) : <Empty icon="robot-outline" text="Chưa có quy tắc nào" />)}

      {tab === 'schedule' && (o.schedules.length ? o.schedules.map((s) => {
        const d = o.devices.find((x) => x.id === s.deviceId);
        return (
          <Card key={s.id} style={styles.item}>
            <Pressable style={{ flex: 1 }} onLongPress={admin ? () => confirm('Xóa lịch hẹn giờ này?', () => o.removeSchedule(s.id)) : undefined}>
              <Text style={styles.time}>{s.time}</Text>
              <Text style={styles.sub}>{s.action === 'on' ? 'Bật' : 'Tắt'} · {d?.name || 'Thiết bị đã xóa'}</Text>
              <View style={{ flexDirection: 'row', marginTop: 6 }}>
                {DAY.map((day, i) => (
                  <Text key={day} style={[styles.day, s.days.includes(i) && styles.dayOn]}>{day}</Text>
                ))}
              </View>
            </Pressable>
            <Switch value={s.enabled} disabled={!admin} onValueChange={() => o.toggleSchedule(s.id)} trackColor={{ true: colors.primary }} thumbColor="#fff" activeThumbColor="#fff" />
          </Card>
        );
      }) : <Empty icon="clock-outline" text="Chưa có lịch hẹn giờ" />)}

      <Text style={styles.hint}>{admin ? 'Mẹo: nhấn giữ một mục để xóa.' : 'Chỉ Quản trị viên được thêm, sửa hoặc tắt quy tắc. Bạn vẫn chạy được ngữ cảnh.'}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  icon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.muted, marginTop: 3 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, marginRight: 4, marginBottom: 4, gap: 3 },
  tagText: { fontSize: 11, color: colors.muted },
  run: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  time: { fontSize: 28, fontWeight: '800', color: colors.text },
  day: { fontSize: 11, color: colors.muted, marginRight: 8, fontWeight: '600' },
  dayOn: { color: colors.primary },
  ran: { fontSize: 11, color: colors.success, marginTop: 4, fontWeight: '600' },
  hint: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 10 },
});
