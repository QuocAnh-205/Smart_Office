// Màn hình đăng nhập
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import AuthHero from '../../components/AuthHero';
import { Button, Card, Icon, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';

import { isEmail } from '../../utils/validate';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const e = {};
    if (!isEmail(email)) e.email = 'Email không hợp lệ';
    if (password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await login(email, password, remember);
      router.replace('/(tabs)');
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <AuthHero title="Xin chào! 👋" subtitle="Đăng nhập để điều khiển văn phòng thông minh của bạn" />
        <Card style={styles.form}>
          <Input label="Email" icon="email-outline" placeholder="admin@office.vn" keyboardType="email-address" value={email} onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: null, form: null })); }} error={errors.email} />
          <Input label="Mật khẩu" icon="lock-outline" placeholder="••••••" secure value={password} onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: null, form: null })); }} error={errors.password} />
          <View style={styles.row}>
            <Pressable style={styles.row} onPress={() => setRemember(!remember)}>
              <Icon name={remember ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={colors.primary} />
              <Text style={styles.remember}>Ghi nhớ đăng nhập</Text>
            </Pressable>
            <Link href="/forgot-password" style={styles.link}>Quên mật khẩu?</Link>
          </View>
          {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}
          <Button title="Đăng nhập" icon="login" onPress={submit} loading={loading} style={{ marginTop: 16 }} />

          <View style={styles.divider}>
            <View style={styles.line} /><Text style={styles.or}>hoặc</Text><View style={styles.line} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="outline" title="Vân tay" icon="fingerprint" style={{ flex: 1 }} onPress={() => setErrors({ form: 'Sinh trắc học cần bản build thật (expo-local-authentication).' })} />
            <Button variant="outline" title="Thẻ RFID" icon="card-account-details-outline" style={{ flex: 1 }} onPress={() => setErrors({ form: 'Quẹt thẻ RFID tại đầu đọc RC522 ở cửa văn phòng.' })} />
          </View>
          <Text style={styles.demo}>Tài khoản demo (mật khẩu 123456){'\n'}admin@office.vn (Quản trị) · nhanvien@office.vn (Nhân viên) · khach@office.vn (Khách)</Text>
        </Card>
        <View style={styles.footer}>
          <Text style={{ color: colors.muted }}>Chưa có tài khoản? </Text>
          <Link href="/register" style={styles.link}>Đăng ký ngay</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { marginHorizontal: 20, marginTop: -30, padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  remember: { marginLeft: 6, color: colors.text },
  link: { color: colors.primary, fontWeight: '700' },
  formError: { color: colors.danger, marginTop: 12, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { marginHorizontal: 10, color: colors.muted },
  demo: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', padding: 24 },
});
