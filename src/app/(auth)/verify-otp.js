// Quên mật khẩu - bước 2: nhập mã OTP
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AuthHero from '../../components/AuthHero';
import { Button, Card } from '../../components/ui';
import { colors, radius } from '../../theme';

const LEN = 6;

export default function VerifyOtp() {
  const { email, code: initialCode } = useLocalSearchParams();
  const [code, setCode] = useState(String(initialCode || ''));
  const [digits, setDigits] = useState(Array(LEN).fill(''));
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(60);
  const refs = useRef([]);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const t = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const onChange = (i, v) => {
    const ch = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = ch;
    setDigits(next);
    if (ch && i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const onKey = (i, e) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const verify = () => {
    if (digits.join('') !== code) return setError('Mã xác thực không đúng');
    router.replace({ pathname: '/reset-password', params: { email } });
  };

  const resend = () => {
    setCode(String(Math.floor(100000 + Math.random() * 900000)));
    setDigits(Array(LEN).fill(''));
    setSeconds(60);
    setError('');
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <AuthHero icon="shield-key-outline" title="Xác thực OTP" subtitle={`Mã gồm ${LEN} chữ số đã được gửi tới ${email}`} />
      <Card style={styles.form}>
        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => { refs.current[i] = r; }}
              style={[styles.otp, d && { borderColor: colors.primary }]}
              keyboardType="number-pad"
              maxLength={1}
              value={d}
              onChangeText={(v) => onChange(i, v)}
              onKeyPress={(e) => onKey(i, e)}
            />
          ))}
        </View>
        <Text style={styles.demo}>(Chế độ demo) Mã của bạn: <Text style={{ fontWeight: '800', color: colors.primary }}>{code}</Text></Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Xác nhận" icon="check-circle-outline" onPress={verify} style={{ marginTop: 16 }} disabled={digits.join('').length < LEN} />
        <Text style={styles.resend}>
          {seconds > 0 ? `Gửi lại mã sau ${seconds}s` : <Text style={{ color: colors.primary, fontWeight: '700' }} onPress={resend}>Gửi lại mã</Text>}
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { marginHorizontal: 20, marginTop: -30, padding: 20 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  otp: { width: 46, height: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, textAlign: 'center', fontSize: 22, fontWeight: '700', color: colors.text, backgroundColor: colors.bg },
  demo: { textAlign: 'center', color: colors.muted, marginTop: 16, fontSize: 13 },
  error: { textAlign: 'center', color: colors.danger, marginTop: 10 },
  resend: { textAlign: 'center', color: colors.muted, marginTop: 18 },
});
