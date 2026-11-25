// Quên mật khẩu - bước 1: nhập email
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import AuthHero from '../../components/AuthHero';
import { Button, Card, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import { isEmail } from '../../utils/validate';

export default function ForgotPassword() {
  const { emailExists } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = () => {
    if (!isEmail(email)) return setError('Email không hợp lệ');
    if (!emailExists(email)) return setError('Không tìm thấy tài khoản với email này');
    setError('');
    setLoading(true);
    // Mô phỏng gửi mã OTP qua email
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setTimeout(() => {
      setLoading(false);
      router.push({ pathname: '/verify-otp', params: { email, code } });
    }, 800);
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <AuthHero icon="lock-question" title="Quên mật khẩu?" subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi mã xác thực gồm 6 chữ số." />
      <Card style={styles.form}>
        <Input label="Email" icon="email-outline" placeholder="ban@congty.vn" keyboardType="email-address" value={email} onChangeText={setEmail} error={error} />
        <Button title="Gửi mã xác thực" icon="send-outline" onPress={submit} loading={loading} />
        <Text style={styles.back} onPress={() => router.back()}>← Quay lại đăng nhập</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { marginHorizontal: 20, marginTop: -30, padding: 20 },
  back: { textAlign: 'center', color: colors.primary, fontWeight: '600', marginTop: 18 },
});
