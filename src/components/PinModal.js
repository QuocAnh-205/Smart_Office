// Hộp nhập mã PIN dùng chung: mọi thao tác mở khóa cửa (thẻ thiết bị, trang chủ, ngữ cảnh, "mở tất cả")
// đều đi qua đây. Sai 3 lần liên tiếp thì khóa bàn phím 30 giây.
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useOffice } from '../context/OfficeContext';
import { colors, radius } from '../theme';
import { Icon } from './ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function PinModal() {
  const { pinRequest } = useOffice();
  if (!pinRequest) return null;
  // key: mỗi yêu cầu mới tạo một bàn phím mới (xóa số đã nhập trước đó)
  return <PinSheet key={pinRequest.id} request={pinRequest} />;
}

function PinSheet({ request: pinRequest }) {
  const { submitPin, cancelPin, pinLockedFor, settings } = useOffice();
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState('');
  const [locked, setLocked] = useState(() => pinLockedFor());
  const len = settings.doorPin?.length || 4;

  // Đếm ngược khi bàn phím bị khóa
  useEffect(() => {
    if (!locked) return undefined;
    const t = setTimeout(() => setLocked(pinLockedFor()), 1000);
    return () => clearTimeout(t);
  }, [locked, pinLockedFor]);

  const press = (k) => {
    if (locked) return;
    if (k === '⌫') { setPin((p) => p.slice(0, -1)); return; }
    if (!k || pin.length >= len) return;
    const next = pin + k;
    setPin(next);
    setMsg('');
    if (next.length === len) {
      const r = submitPin(next);
      if (r === 'wrong') { setMsg('Mã PIN không đúng'); setTimeout(() => setPin(''), 350); }
      if (r === 'locked') { setMsg('Sai quá nhiều lần'); setPin(''); setLocked(pinLockedFor()); }
    }
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={cancelPin} />
      <View style={styles.sheet}>
        <View style={styles.iconWrap}><Icon name="shield-lock-outline" size={30} color={colors.success} /></View>
        <Text style={styles.title}>{pinRequest.title}</Text>
        <Text style={styles.sub}>{pinRequest.subtitle || 'Nhập mã PIN để xác nhận'}</Text>
        <View style={styles.dots}>
          {Array.from({ length: len }, (_, i) => (
            <View key={i} style={[styles.dot, i < pin.length && { backgroundColor: colors.success }]} />
          ))}
        </View>
        <Text style={styles.msg}>{locked ? `Bàn phím bị khóa, thử lại sau ${locked} giây` : msg || ' '}</Text>
        <View style={styles.pad}>
          {KEYS.map((k, i) => (
            <Pressable key={i} onPress={() => press(k)} disabled={!k || !!locked}
              style={({ pressed }) => [styles.key, !k && { backgroundColor: 'transparent' }, pressed && k && { backgroundColor: colors.primaryLight }, locked && { opacity: 0.4 }]}>
              <Text style={styles.keyText}>{k}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={cancelPin} style={styles.cancel}><Text style={styles.cancelText}>Hủy</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end', zIndex: 100 },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 22, paddingBottom: 30, alignItems: 'center' },
  iconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.success + '1A', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 10, textAlign: 'center' },
  sub: { color: colors.muted, marginTop: 4, textAlign: 'center' },
  dots: { flexDirection: 'row', marginTop: 18 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.success, marginHorizontal: 8 },
  msg: { color: colors.danger, marginTop: 10, fontWeight: '600', minHeight: 20 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8, alignSelf: 'stretch' },
  key: { width: '31%', height: 56, borderRadius: 14, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  keyText: { fontSize: 22, fontWeight: '700', color: colors.text },
  cancel: { paddingVertical: 10, paddingHorizontal: 30 },
  cancelText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
});
