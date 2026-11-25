// Màn hình đăng ký
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import AuthHero from '../../components/AuthHero';
import { Button, Card, Icon, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import { isEmail } from '../../utils/validate';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', department: '', password: '', confirm: '' });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: null }));
  };

  const submit = async () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Vui lòng nhập họ tên';
    if (!isEmail(form.email)) e.email = 'Email không hợp lệ';
    if (!/^0\d{9}$/.test(form.phone.trim())) e.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0';
    if (form.password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự';
    if (form.confirm !== form.password) e.confirm = 'Mật khẩu nhập lại không khớp';
    if (!agree) e.form = 'Bạn cần đồng ý với điều khoản sử dụng';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await register(form);
      router.replace('/(tabs)');
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <AuthHero icon="account-plus-outline" title="Tạo tài khoản" subtitle="Đăng ký để tham gia hệ thống văn phòng thông minh" />
        <Card style={styles.form}>
          <Input label="Họ và tên" icon="account-outline" placeholder="Nguyễn Văn A" autoCapitalize="words" value={form.name} onChangeText={set('name')} error={errors.name} />
          <Input label="Email" icon="email-outline" placeholder="ban@congty.vn" keyboardType="email-address" value={form.email} onChangeText={set('email')} error={errors.email} />
          <Input label="Số điện thoại" icon="phone-outline" placeholder="09xxxxxxxx" keyboardType="phone-pad" value={form.phone} onChangeText={set('phone')} error={errors.phone} />
          <Input label="Phòng ban" icon="domain" placeholder="Phòng Kỹ thuật" autoCapitalize="words" value={form.department} onChangeText={set('department')} />
          <Input label="Mật khẩu" icon="lock-outline" placeholder="Tối thiểu 6 ký tự" secure value={form.password} onChangeText={set('password')} error={errors.password} />
          <Input label="Nhập lại mật khẩu" icon="lock-check-outline" placeholder="Nhập lại mật khẩu" secure value={form.confirm} onChangeText={set('confirm')} error={errors.confirm} />
          <Pressable style={styles.row} onPress={() => setAgree(!agree)}>
            <Icon name={agree ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={colors.primary} />
            <Text style={styles.agree}>Tôi đồng ý với <Text style={styles.link}>Điều khoản</Text> và <Text style={styles.link}>Chính sách bảo mật</Text></Text>
          </Pressable>
          {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}
          <Button title="Đăng ký" icon="account-check-outline" onPress={submit} loading={loading} style={{ marginTop: 16 }} />
        </Card>
        <View style={styles.footer}>
          <Text style={{ color: colors.muted }}>Đã có tài khoản? </Text>
          <Link href="/login" style={styles.link}>Đăng nhập</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { marginHorizontal: 20, marginTop: -30, padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  agree: { marginLeft: 8, color: colors.text, flex: 1, lineHeight: 20 },
  link: { color: colors.primary, fontWeight: '700' },
  formError: { color: colors.danger, marginTop: 12, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', padding: 20 },
});
