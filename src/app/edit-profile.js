// Chỉnh sửa hồ sơ
import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Button, Input, Screen } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function EditProfile() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const save = async () => {
    const e = {};
    if (name.trim().length < 2) e.name = 'Vui lòng nhập họ tên';
    if (phone && !/^0\d{9}$/.test(phone.trim())) e.phone = 'Số điện thoại không hợp lệ';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    await updateProfile({ name: name.trim(), phone: phone.trim(), department: department.trim() });
    setLoading(false);
    router.back();
  };

  return (
    <Screen title="Chỉnh sửa hồ sơ">
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Avatar name={name || '?'} size={96} />
      </View>
      <Input label="Họ và tên" icon="account-outline" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" />
      <Input label="Email" icon="email-outline" value={user?.email} editable={false} />
      <Input label="Số điện thoại" icon="phone-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
      <Input label="Phòng ban" icon="domain" value={department} onChangeText={setDepartment} autoCapitalize="words" />
      <Input label="Vai trò" icon="shield-account-outline" value={user?.role} editable={false} />
      <Button title="Lưu thay đổi" icon="content-save-outline" onPress={save} loading={loading} />
    </Screen>
  );
}
