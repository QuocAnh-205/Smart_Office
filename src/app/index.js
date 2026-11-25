// Màn hình khởi động (Splash): chờ đọc dữ liệu rồi điều hướng
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/ui';
import { gradients } from '../theme';

export default function Splash() {
  const { ready, user, onboarded } = useAuth();
  const [minDelay, setMinDelay] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinDelay(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (ready && minDelay) {
    if (!onboarded) return <Redirect href="/onboarding" />;
    if (!user) return <Redirect href="/login" />;
    return <Redirect href="/(tabs)" />;
  }

  return (
    <LinearGradient colors={gradients.primary} style={styles.container}>
      <View style={styles.logo}>
        <Icon name="office-building-cog" size={64} color="#fff" />
      </View>
      <Text style={styles.title}>Smart Office</Text>
      <Text style={styles.sub}>Văn phòng thông minh · IoT Arduino</Text>
      <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 120, height: 120, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 24 },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 6 },
});
