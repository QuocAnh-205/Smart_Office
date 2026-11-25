import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './ui';
import { gradients } from '../theme';

/** Phần đầu có nền gradient dùng chung cho các màn hình xác thực */
export default function AuthHero({ icon = 'office-building-cog', title, subtitle }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={gradients.primary} style={[styles.hero, { paddingTop: insets.top + 30 }]}>
      <View style={styles.logo}><Icon name={icon} size={40} color="#fff" /></View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 50, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  logo: { width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 6, lineHeight: 21 },
});
