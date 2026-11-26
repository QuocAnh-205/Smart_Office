// Màn hình đăng nhập
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import AuthHero from '../../components/AuthHero';
import { Button, Card, Icon, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';

import { isEmail } from '../../utils/validate';

// Chỉ tự bật hộp thoại vân tay một lần mỗi lần mở app (không làm phiền ngay sau khi bấm Đăng xuất)
let autoPrompted = false;

/** Hỏi Có/Không trên điện thoại, trả về Promise<boolean> */
const ask = (title, message, okText) => new Promise((resolve) => {
  Alert.alert(title, message, [
    { text: 'Để sau', style: 'cancel', onPress: () => resolve(false) },
    { text: okText, onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) });
});

export default function Login() {
  const { login, ready, bioAccount, biometricStatus, enableBiometric, loginWithBiometric } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bio, setBio] = useState({ available: false, reason: null, label: 'Vân tay' });

  const bioLogin = async () => {
    if (bioLoading) return;
    setErrors({});
    setBioLoading(true);
    try {
      const u = await loginWithBiometric(remember);
      if (u) router.replace('/(tabs)');
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setBioLoading(false);
    }
  };

  // Đọc trạng thái cảm biến; nếu máy đã bật vân tay thì tự hiện hộp thoại quét khi mở app
  useEffect(() => {
    if (!ready) return undefined;
    let alive = true;
    biometricStatus().then((st) => {
      if (!alive) return;
      setBio(st);
      if (st.available && bioAccount && !autoPrompted) {
        autoPrompted = true;
        bioLogin();
      }
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, bioAccount]);

  const submit = async () => {
    const e = {};
    if (!isEmail(email)) e.email = 'Email không hợp lệ';
    if (password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const u = await login(email, password, remember);
      // Lần đầu đăng nhập bằng mật khẩu trên máy có vân tay: mời bật đăng nhập nhanh
      if (bio.available && bioAccount?.id !== u.id) {
        const msg = bioAccount
          ? `Vân tay trên máy này đang dùng cho ${bioAccount.email}. Chuyển sang tài khoản ${u.email}?`
          : `Lần sau chỉ cần quét ${bio.label.toLowerCase()} để đăng nhập ${u.email}.`;
        if (await ask(`Đăng nhập bằng ${bio.label.toLowerCase()}`, msg, 'Bật')) {
          try { await enableBiometric(u); } catch (err) { Alert.alert('Chưa bật được', err.message); }
        }
      }
      router.replace('/(tabs)');
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  };

  const onBioPress = () => {
    if (!bio.available) return setErrors({ form: bio.reason });
    if (!bioAccount) return setErrors({ form: `Chưa bật đăng nhập bằng ${bio.label.toLowerCase()} trên máy này. Hãy đăng nhập bằng mật khẩu một lần, app sẽ hỏi bật (hoặc vào Cài đặt → Bảo mật).` });
    return bioLogin();
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
            <Button variant="outline" title={bio.label} icon={bio.label === 'Khuôn mặt' ? 'face-recognition' : 'fingerprint'} style={{ flex: 1 }} loading={bioLoading} onPress={onBioPress} />
            <Button variant="outline" title="Thẻ RFID" icon="card-account-details-outline" style={{ flex: 1 }} onPress={() => setErrors({ form: 'Quẹt thẻ RFID tại đầu đọc RC522 ở cửa văn phòng.' })} />
          </View>
          {bio.available && bioAccount ? <Text style={styles.bioHint}>Đăng nhập nhanh: {bioAccount.name} ({bioAccount.email})</Text> : null}
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
  bioHint: { textAlign: 'center', color: colors.primary, fontSize: 13, marginTop: 12, fontWeight: '600' },
  demo: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', padding: 24 },
});
