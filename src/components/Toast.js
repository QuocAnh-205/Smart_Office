// Banner thông báo trong app (hiện khi bật "Thông báo đẩy" trong Cài đặt)
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOffice } from '../context/OfficeContext';
import { colors, radius } from '../theme';
import { Icon } from './ui';

const TYPE = {
  warning: { icon: 'alert-outline', color: colors.warning },
  danger: { icon: 'alert-octagon-outline', color: colors.danger },
  info: { icon: 'information-outline', color: colors.info },
  success: { icon: 'check-circle-outline', color: colors.success },
};

export default function Toast() {
  const { toast, dismissToast, markRead } = useOffice();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(dismissToast, toast.type === 'danger' ? 7000 : 4000);
    return () => clearTimeout(t);
  }, [toast, dismissToast]);

  if (!toast) return null;
  const t = TYPE[toast.type] || TYPE.info;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Pressable
        style={[styles.card, { borderLeftColor: t.color }]}
        onPress={() => { markRead(toast.id); dismissToast(); router.push('/notifications'); }}
      >
        <Icon name={t.icon} size={24} color={t.color} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
          <Text style={styles.msg} numberOfLines={3}>{toast.message}</Text>
        </View>
        <Pressable hitSlop={10} onPress={dismissToast}><Icon name="close" size={18} color={colors.muted} /></Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 90 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, padding: 12,
    borderLeftWidth: 5, boxShadow: '0px 12px 30px rgba(15,23,42,0.22)',
  },
  title: { fontWeight: '800', color: colors.text },
  msg: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
