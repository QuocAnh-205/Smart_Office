// Quên mật khẩu - bước 3: đặt mật khẩu mới
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AuthHero from '../../components/AuthHero';
import { Button, Card, Icon, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';

export default function ResetPassword() {
  const { email } = useLocalSearchParams();
  const { resetPassword } = useAuth();
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);

  const submit = async () => {
    const e = {};
    if (pass.length < 6) e.pass = 'Mật khẩu tối thiểu 6 ký tự';
    if (confirm !== pass) e.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(e);
    if (Object.keys(e).length) return;
    await resetPassword(String(email), pass);
    setDone(true);
  };

  if (done) {
    return (
      <View style={styles.success}>
        <View style={styles.check}><Icon name="check-bold" size={60} color="#fff" /></View>
        <Text style={styles.title}>Đổi mật khẩu thành công!</Text>
        <Text style={styles.sub}>Bạn có thể đăng nhập bằng mật khẩu mới.</Text>
        <Button title="Về trang đăng nhập" icon="login" onPress={() => router.replace('/login')} style={{ alignSelf: 'stretch', marginTop: 30 }} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <AuthHero icon="lock-reset" title="Mật khẩu mới" subtitle="Tạo mật khẩu mới cho tài khoản của bạn" />
      <Card style={styles.form}>
        <Input label="Mật khẩu mới" icon="lock-outline" secure value={pass} onChangeText={setPass} error={errors.pass} placeholder="Tối thiểu 6 ký tự" />
        <Input label="Nhập lại mật khẩu" icon="lock-check-outline" secure value={confirm} onChangeText={setConfirm} error={errors.confirm} placeholder="Nhập lại" />
        <Button title="Cập nhật mật khẩu" icon="content-save-outline" onPress={submit} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { marginHorizontal: 20, marginTop: -30, padding: 20 },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  check: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 24 },
  sub: { color: colors.muted, marginTop: 8 },
});
