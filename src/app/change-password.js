// Đổi mật khẩu
import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Input, Screen } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { showMessage } from '../utils/helpers';

export default function ChangePassword() {
  const { changePassword } = useAuth();
  const [oldPass, setOld] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});

  const submit = async () => {
    const e = {};
    if (!oldPass) e.old = 'Nhập mật khẩu hiện tại';
    if (pass.length < 6) e.pass = 'Mật khẩu mới tối thiểu 6 ký tự';
    else if (pass === oldPass) e.pass = 'Mật khẩu mới phải khác mật khẩu cũ';
    if (confirm !== pass) e.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      await changePassword(oldPass, pass);
      showMessage('Thành công', 'Mật khẩu đã được thay đổi.');
      router.back();
    } catch (err) {
      setErrors({ old: err.message });
    }
  };

  return (
    <Screen title="Đổi mật khẩu">
      <Text style={{ color: colors.muted, marginBottom: 16 }}>Mật khẩu nên có ít nhất 6 ký tự, kết hợp chữ và số.</Text>
      <Input label="Mật khẩu hiện tại" icon="lock-outline" secure value={oldPass} onChangeText={setOld} error={errors.old} />
      <Input label="Mật khẩu mới" icon="lock-plus-outline" secure value={pass} onChangeText={setPass} error={errors.pass} />
      <Input label="Nhập lại mật khẩu mới" icon="lock-check-outline" secure value={confirm} onChangeText={setConfirm} error={errors.confirm} />
      <Button title="Cập nhật" icon="check" onPress={submit} />
    </Screen>
  );
}
