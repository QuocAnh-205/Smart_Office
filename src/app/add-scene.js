// Tạo ngữ cảnh mới (nhiều hành động cùng lúc)
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Icon, Input, Screen, SectionTitle } from '../components/ui';
import { useOffice } from '../context/OfficeContext';
import { colors, DEVICE_META } from '../theme';

const ICONS = ['weather-sunny', 'weather-night', 'presentation', 'coffee', 'party-popper', 'shield-home', 'movie-open', 'leaf'];
const COLORS = ['#F59E0B', '#4F6AF5', '#22C55E', '#8B5CF6', '#EC4899', '#06B6D4', '#EF4444'];

// Mỗi loại thiết bị có 3 lựa chọn: bỏ qua / bật / tắt
const STATES = ['skip', 'on', 'off'];

export default function AddScene() {
  const { addScene } = useOffice();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [acts, setActs] = useState({});
  const [error, setError] = useState('');

  const cycle = (t) => setActs((a) => ({ ...a, [t]: STATES[(STATES.indexOf(a[t] || 'skip') + 1) % 3] }));

  const save = () => {
    if (name.trim().length < 2) return setError('Vui lòng nhập tên ngữ cảnh');
    const actions = Object.entries(acts).filter(([, v]) => v !== 'skip').map(([type, v]) => {
      if (type === 'door') return { type, locked: v === 'on' };
      if (type === 'curtain') return { type, position: v === 'on' ? 100 : 0 };
      return { type, on: v === 'on' };
    });
    if (!actions.length) return setError('Chọn ít nhất một hành động');
    if (addScene({ name: name.trim(), icon, color, actions })) router.back();
    return undefined;
  };

  return (
    <Screen title="Tạo ngữ cảnh" subtitle="Điều khiển nhiều thiết bị chỉ với 1 chạm">
      <Input label="Tên ngữ cảnh" icon="palette-outline" placeholder="VD: Tiếp khách" value={name} onChangeText={(v) => { setName(v); setError(''); }} error={error} autoCapitalize="sentences" />

      <Text style={styles.label}>Biểu tượng & màu</Text>
      <View style={styles.wrap}>
        {ICONS.map((i) => (
          <Pressable key={i} onPress={() => setIcon(i)} style={[styles.icon, { backgroundColor: icon === i ? color : color + '18' }]}>
            <Icon name={i} size={24} color={icon === i ? '#fff' : color} />
          </Pressable>
        ))}
      </View>
      <View style={[styles.wrap, { marginTop: 4 }]}>
        {COLORS.map((c) => (
          <Pressable key={c} onPress={() => setColor(c)} style={[styles.color, { backgroundColor: c }, color === c && styles.colorOn]} />
        ))}
      </View>

      <SectionTitle title="Hành động" />
      <Card style={{ paddingVertical: 4 }}>
        {Object.entries(DEVICE_META).filter(([k]) => k !== 'camera').map(([k, m], idx, arr) => {
          const st = acts[k] || 'skip';
          const label = k === 'door'
            ? { skip: 'Bỏ qua', on: 'Khóa', off: 'Mở khóa' }[st]
            : k === 'curtain' ? { skip: 'Bỏ qua', on: 'Mở', off: 'Đóng' }[st] : { skip: 'Bỏ qua', on: 'Bật', off: 'Tắt' }[st];
          return (
            <Pressable key={k} onPress={() => cycle(k)} style={[styles.row, idx < arr.length - 1 && styles.border]}>
              <Icon name={m.icon} size={24} color={m.color} />
              <Text style={styles.rowText}>Tất cả {m.label.toLowerCase()}</Text>
              <View style={[styles.state, st === 'on' && { backgroundColor: colors.success }, st === 'off' && { backgroundColor: colors.danger }]}>
                <Text style={[styles.stateText, st !== 'skip' && { color: '#fff' }]}>{label}</Text>
              </View>
            </Pressable>
          );
        })}
      </Card>
      <Text style={styles.hint}>Chạm để đổi: Bỏ qua → Bật → Tắt</Text>
      <Button title="Lưu ngữ cảnh" icon="content-save-outline" onPress={save} style={{ marginTop: 16 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  icon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginBottom: 10 },
  color: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  colorOn: { borderWidth: 3, borderColor: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowText: { flex: 1, marginLeft: 12, fontWeight: '600', color: colors.text },
  state: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.bg, minWidth: 72, alignItems: 'center' },
  stateText: { fontWeight: '700', fontSize: 12, color: colors.muted },
  hint: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 8 },
});
