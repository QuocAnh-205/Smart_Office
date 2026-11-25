// Giới thiệu ứng dụng & phần cứng
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Icon, ListItem, Screen, SectionTitle } from '../components/ui';
import { colors, gradients } from '../theme';

const HARDWARE = [
  ['chip', 'ESP32 DevKit V1', 'Vi điều khiển trung tâm, Wi-Fi'],
  ['electric-switch', 'Module Relay 4 kênh 5V', 'Bật/tắt đèn, quạt, tủ đông'],
  ['thermometer', 'DHT22', 'Nhiệt độ & độ ẩm'],
  ['gas-cylinder', 'MQ-2', 'Khí gas / khói'],
  ['motion-sensor', 'PIR HC-SR501', 'Phát hiện chuyển động'],
  ['white-balance-sunny', 'BH1750 / LDR', 'Cường độ ánh sáng'],
  ['snowflake-thermometer', 'DS18B20', 'Nhiệt độ tủ đông'],
  ['card-account-details-outline', 'RFID RC522', 'Chấm công, mở cửa'],
  ['lock', 'Khóa điện từ 12V + Servo SG90', 'Khóa cửa, rèm'],
  ['remote', 'LED hồng ngoại IR', 'Điều khiển điều hòa'],
];

export default function About() {
  return (
    <Screen title="Giới thiệu">
      <LinearGradient colors={gradients.primary} style={{ borderRadius: 24, padding: 24, alignItems: 'center' }}>
        <Icon name="office-building-cog" size={56} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 10 }}>Smart Office</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>Phiên bản 1.0.0</Text>
        <Text style={{ color: '#fff', textAlign: 'center', marginTop: 12, lineHeight: 20 }}>
          Đồ án Hệ thống văn phòng thông minh sử dụng Arduino/ESP32 và ứng dụng di động React Native (Expo).
        </Text>
      </LinearGradient>

      <SectionTitle title="Phần cứng sử dụng" />
      <Card style={{ paddingVertical: 0 }}>
        {HARDWARE.map(([icon, t, s], i) => <ListItem key={t} icon={icon} title={t} subtitle={s} last={i === HARDWARE.length - 1} />)}
      </Card>

      <SectionTitle title="Công nghệ" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {['React Native', 'Expo Router', 'AsyncStorage', 'ESP32 WebServer', 'ArduinoJson', 'REST API'].map((t) => (
          <View key={t} style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 }}>
            <Text style={{ color: colors.primaryDark, fontWeight: '600', fontSize: 12 }}>{t}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
