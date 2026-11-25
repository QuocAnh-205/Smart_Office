import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { OfficeProvider } from '../context/OfficeContext';
import PinModal from '../components/PinModal';
import Toast from '../components/Toast';
import { colors } from '../theme';

const isWeb = Platform.OS === 'web';

// Trên web: dùng font Be Vietnam Pro (hiển thị tiếng Việt đẹp), ẩn thanh cuộn.
// 'material-community' đứng sau để các ký tự icon vẫn lấy đúng font icon.
if (isWeb && typeof document !== 'undefined' && !document.getElementById('so-global-style')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(link);
  const style = document.createElement('style');
  style.id = 'so-global-style';
  style.textContent = `
    html, body { background: radial-gradient(1200px 600px at 20% 0%, #E0E7FF 0%, #F1F5F9 45%, #EDE9FE 100%); }
    div, span, input, textarea, button {
      font-family: 'Be Vietnam Pro', 'material-community', system-ui, -apple-system, 'Segoe UI', Roboto, 'Segoe UI Emoji', sans-serif !important;
    }
    ::-webkit-scrollbar { width: 0; height: 0; }
    * { scrollbar-width: none; -webkit-tap-highlight-color: transparent; }
    input:focus, textarea:focus { outline: none; }
  `;
  document.head.appendChild(style);
}

function WebFrame({ children }) {
  const { width, height } = useWindowDimensions();
  if (!isWeb) return children;
  // Màn hình rộng (máy tính): hiển thị app trong khung điện thoại ở giữa
  const desktop = width > 640;
  return (
    <View style={styles.outer}>
      <View
        style={[
          styles.inner,
          desktop ? { height: Math.min(height - 40, 900), marginVertical: 20, borderRadius: 36, borderWidth: 8, borderColor: '#0F172A' } : { flex: 1 },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OfficeProvider>
          <StatusBar style="dark" />
          <WebFrame>
            <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
              <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            </Stack>
            <Toast />
            <PinModal />
            </View>
          </WebFrame>
        </OfficeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    boxShadow: '0px 30px 80px rgba(15, 23, 42, 0.25)',
  },
});
