// Trang cá nhân
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, Card, ListItem, Screen } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useOffice } from '../../context/OfficeContext';
import { colors, gradients, radius } from '../../theme';
import { confirmAction } from '../../utils/helpers';

export default function Profile() {
  const { user, logout } = useAuth();
  const { stats, rooms } = useOffice();

  const doLogout = () => confirmAction('Bạn có chắc muốn đăng xuất?', async () => {
    await logout();
    router.replace('/login');
  }, 'Đăng xuất');

  return (
    <Screen>
      <LinearGradient colors={gradients.primary} style={styles.hero}>
        <View style={styles.avatarRing}><Avatar name={user?.name} size={76} color="#FFFFFF" /></View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.role}><Text style={styles.roleText}>{user?.role} · {user?.department}</Text></View>
        <View style={styles.statRow}>
          <Stat value={stats.total} label="Thiết bị" />
          <Stat value={rooms.length} label="Phòng" />
          <Stat value={stats.active} label="Đang bật" />
        </View>
      </LinearGradient>

      <Text style={styles.group}>Tài khoản</Text>
      <Card style={styles.card}>
        <ListItem icon="account-edit-outline" title="Chỉnh sửa hồ sơ" onPress={() => router.push('/edit-profile')} />
        <ListItem icon="lock-reset" iconColor={colors.warning} title="Đổi mật khẩu" onPress={() => router.push('/change-password')} />
        <ListItem icon="account-group-outline" iconColor={colors.info} title="Quản lý thành viên" onPress={() => router.push('/members')} last />
      </Card>

      <Text style={styles.group}>Hệ thống</Text>
      <Card style={styles.card}>
        <ListItem icon="lan-connect" iconColor={colors.success} title="Kết nối ESP32 / Arduino" subtitle="Địa chỉ IP, chế độ mô phỏng" onPress={() => router.push('/connection')} />
        <ListItem icon="devices" iconColor={colors.purple} title="Quản lý thiết bị" onPress={() => router.push('/devices')} />
        <ListItem icon="history" iconColor={colors.pink} title="Lịch sử hoạt động" onPress={() => router.push('/history')} />
        <ListItem icon="cog-outline" iconColor={colors.muted} title="Cài đặt" onPress={() => router.push('/settings')} last />
      </Card>

      <Text style={styles.group}>Hỗ trợ</Text>
      <Card style={styles.card}>
        <ListItem icon="help-circle-outline" iconColor={colors.info} title="Trợ giúp & câu hỏi thường gặp" onPress={() => router.push('/help')} />
        <ListItem icon="information-outline" title="Giới thiệu ứng dụng" onPress={() => router.push('/about')} />
        <ListItem icon="logout" title="Đăng xuất" danger onPress={doLogout} last right={null} />
      </Card>
    </Screen>
  );
}

function Stat({ value, label }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: 22, alignItems: 'center' },
  avatarRing: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 50, padding: 3 },
  name: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 12 },
  email: { color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  role: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10 },
  roleText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statRow: { flexDirection: 'row', marginTop: 18, alignSelf: 'stretch' },
  group: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 22, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
  card: { paddingVertical: 0 },
});
