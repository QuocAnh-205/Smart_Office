// Tạo quy tắc tự động: NẾU <điều kiện> THÌ <hành động>. Bộ xử lý trong OfficeContext sẽ thực thi thật.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Chip, Icon, Input, Screen, SectionTitle } from '../components/ui';
import { useOffice, useTemp } from '../context/OfficeContext';
import { colors } from '../theme';
import { ACTIONS, actionText, TRIGGERS, triggerText, validateCond } from '../utils/automation';
import { cToF, fToC } from '../utils/time';

const TRIGGER_KEYS = Object.keys(TRIGGERS);
const ACTION_KEYS = Object.keys(ACTIONS);

export default function AddAutomation() {
  const { addAutomation, rooms, can } = useOffice();
  const { unit } = useTemp();
  const toInput = (key) => {
    const def = TRIGGERS[key].def;
    if (def === undefined) return '';
    return key === 'temp' && unit === 'F' ? String(Math.round(cToF(def))) : String(def);
  };
  const [trigger, setTrigger] = useState('temp');
  const [value, setValue] = useState(toInput('temp'));
  const [action, setAction] = useState('fan_on');
  const [roomId, setRoomId] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const t = TRIGGERS[trigger];
  const a = ACTIONS[action];
  const unitLabel = trigger === 'temp' ? `°${unit}` : t.unit;

  // Giá trị lưu: nhiệt độ luôn đổi về °C
  const storedValue = () => {
    if (trigger === 'motion') return undefined;
    if (trigger === 'time') return value.trim();
    const n = Number(value);
    return trigger === 'temp' && unit === 'F' ? Math.round(fToC(n) * 10) / 10 : n;
  };
  const cond = { key: trigger, value: storedValue() };
  const act = { key: action, ...(a.type && roomId ? { roomId } : {}) };

  const save = () => {
    const err = validateCond(trigger, trigger === 'time' ? value.trim() : value);
    if (err) { setError(err); return; }
    const ok = addAutomation({
      name: name.trim() || `${t.label} → ${a.label}`,
      icon: t.icon,
      cond,
      act,
    });
    if (ok) router.back();
  };

  if (!can('automation.manage')) {
    return (
      <Screen title="Quy tắc tự động">
        <Card><Text style={{ color: colors.muted }}>Chỉ Quản trị viên được tạo quy tắc tự động.</Text></Card>
      </Screen>
    );
  }

  return (
    <Screen title="Quy tắc tự động" subtitle="NẾU … THÌ …">
      <Input label="Tên quy tắc (tùy chọn)" icon="tag-outline" placeholder="VD: Làm mát khi nóng" value={name} onChangeText={setName} autoCapitalize="sentences" />

      <SectionTitle title="① NẾU (điều kiện)" style={{ marginTop: 6 }} />
      <Card style={{ paddingVertical: 4 }}>
        {TRIGGER_KEYS.map((k, i) => (
          <Pressable key={k} onPress={() => { setTrigger(k); setValue(toInput(k)); setError(''); }} style={[styles.row, i < TRIGGER_KEYS.length - 1 && styles.border]}>
            <Icon name={TRIGGERS[k].icon} size={22} color={colors.primary} />
            <Text style={styles.rowText}>{TRIGGERS[k].label}</Text>
            <Icon name={trigger === k ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={colors.primary} />
          </Pressable>
        ))}
      </Card>
      {t.unit ? (
        <Input style={{ marginTop: 12 }} label={trigger === 'time' ? 'Giờ (HH:MM)' : `Ngưỡng (${unitLabel})`} icon="tune" value={value}
          onChangeText={(v) => { setValue(v); setError(''); }} error={error} keyboardType={trigger === 'time' ? 'numbers-and-punctuation' : 'numeric'} />
      ) : null}

      <SectionTitle title="② THÌ (hành động)" />
      <Card style={{ paddingVertical: 4 }}>
        {ACTION_KEYS.map((k, i) => (
          <Pressable key={k} onPress={() => setAction(k)} style={[styles.row, i < ACTION_KEYS.length - 1 && styles.border]}>
            <Icon name={ACTIONS[k].icon} size={22} color={colors.success} />
            <Text style={styles.rowText}>{ACTIONS[k].label}</Text>
            <Icon name={action === k ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={colors.success} />
          </Pressable>
        ))}
      </Card>

      {a.type ? (
        <>
          <SectionTitle title="③ Áp dụng cho" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip label="Tất cả phòng" active={!roomId} onPress={() => setRoomId(null)} />
            {rooms.map((r) => <Chip key={r.id} label={r.name} icon={r.icon} active={roomId === r.id} onPress={() => setRoomId(r.id)} />)}
          </ScrollView>
        </>
      ) : null}

      <Card style={styles.preview}>
        <Text style={styles.pv}>NẾU <Text style={styles.pvB}>{validateCond(trigger, value) ? '…' : triggerText(cond, unit)}</Text></Text>
        <Text style={styles.pv}>THÌ <Text style={styles.pvB}>{actionText(act, rooms)}</Text></Text>
        <Text style={styles.note}>
          {trigger === 'time'
            ? 'Quy tắc chạy một lần vào đúng giờ này mỗi ngày.'
            : 'Quy tắc chạy khi điều kiện chuyển từ sai sang đúng (không lặp lại liên tục), tối đa 1 lần/phút.'}
        </Text>
      </Card>
      <Button title="Lưu quy tắc" icon="content-save-outline" onPress={save} style={{ marginTop: 16 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowText: { flex: 1, marginLeft: 12, color: colors.text, fontWeight: '500' },
  preview: { marginTop: 20, backgroundColor: colors.primaryLight },
  pv: { color: colors.primaryDark, fontSize: 15, marginVertical: 2 },
  pvB: { fontWeight: '800' },
  note: { color: colors.muted, fontSize: 12, marginTop: 6 },
});
