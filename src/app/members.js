// Quản lý thành viên: dùng chung danh sách tài khoản đăng nhập (AuthContext, lưu AsyncStorage).
// Quản trị viên mời thành viên (mật khẩu mặc định 123456), đổi vai trò, gán thẻ RFID, xóa.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Card, Chip, Icon, Input, Screen, SectionTitle } from '../components/ui';
import { DEFAULT_PASSWORD, useAuth } from '../context/AuthContext';
import { useOffice } from '../context/OfficeContext';
import { colors } from '../theme';
import { confirmAction, showMessage } from '../utils/helpers';
import { ROLE_DESC, ROLE_LIST, ROLES } from '../utils/permissions';
import { dateKey } from '../utils/time';
import { isEmail } from '../utils/validate';

const ROLE_COLOR = { [ROLES.ADMIN]: colors.danger, [ROLES.STAFF]: colors.primary, [ROLES.GUEST]: colors.muted };
const CARD_RE = /^([0-9A-F]{2}:){3,6}[0-9A-F]{2}$/i;

export default function Members() {
  const { user, users, addMember, updateMember, removeMember } = useAuth();
  const { attendance, can, log } = useOffice();
  const admin = can('member.manage');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLES.STAFF);
  const [card, setCard] = useState('');
  const [error, setError] = useState('');

  const today = dateKey();
  const present = (id) => {
    const r = attendance.find((a) => a.userId === id && a.date === today);
    return r?.checkIn && !r.checkOut;
  };

  const run = async (fn, okText) => {
    try {
      await fn();
      if (okText) log(okText, 'account-cog-outline');
      return true;
    } catch (e) {
      showMessage('Không thực hiện được', e.message);
      return false;
    }
  };

  const reset = () => { setName(''); setEmail(''); setCard(''); setRole(ROLES.STAFF); setError(''); };

  const add = async () => {
    if (name.trim().length < 2 || !isEmail(email)) return setError('Nhập họ tên và email hợp lệ');
    if (card && !CARD_RE.test(card.trim())) return setError('Mã thẻ dạng AA:BB:CC:DD');
    if (await run(() => addMember({ name, email, role, card }), `Thêm thành viên ${name.trim()}`)) {
      showMessage('Đã thêm thành viên', `${name.trim()} đăng nhập bằng ${email.trim()} / mật khẩu ${DEFAULT_PASSWORD}`);
      reset(); setAdding(false);
    }
    return undefined;
  };

  const saveEdit = async (m) => {
    if (card && !CARD_RE.test(card.trim())) return setError('Mã thẻ dạng AA:BB:CC:DD');
    if (await run(() => updateMember(m.id, { role, card: card || null }), `Cập nhật ${m.name}: ${role}`)) {
      setEditing(null); reset();
    }
    return undefined;
  };

  return (
    <Screen title="Thành viên" subtitle={`${users.length} tài khoản · ${users.filter((u) => present(u.id)).length} đang có mặt`}>
      {admin ? (adding ? (
        <Card style={{ marginBottom: 16 }}>
          <Input label="Họ tên" icon="account-outline" value={name} onChangeText={setName} autoCapitalize="words" />
          <Input label="Email đăng nhập" icon="email-outline" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Input label="Mã thẻ RFID (tùy chọn)" icon="card-account-details-outline" placeholder="AA:BB:CC:DD" value={card} onChangeText={setCard} autoCapitalize="characters" error={error} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
            {ROLE_LIST.map((r) => <Chip key={r} label={r} active={role === r} color={ROLE_COLOR[r]} onPress={() => setRole(r)} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Hủy" variant="outline" style={{ flex: 1 }} onPress={() => { setAdding(false); reset(); }} />
            <Button title="Thêm" icon="account-plus" style={{ flex: 1 }} onPress={add} />
          </View>
        </Card>
      ) : (
        <Button title="Thêm thành viên" icon="account-plus-outline" onPress={() => { reset(); setEditing(null); setAdding(true); }} />
      )) : (
        <Card><Text style={{ color: colors.muted }}>Bạn đang xem với vai trò {user?.role}. Chỉ Quản trị viên được thêm, sửa hoặc xóa thành viên.</Text></Card>
      )}

      <SectionTitle title="Danh sách" />
      {users.map((m) => (
        <Card key={m.id} style={styles.item}>
          <View style={styles.row}>
            <View>
              <Avatar name={m.name} color={ROLE_COLOR[m.role]} />
              <View style={[styles.online, { backgroundColor: present(m.id) ? colors.success : colors.border }]} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.name}>{m.name}{m.id === user?.id ? ' (bạn)' : ''}</Text>
              <Text style={styles.sub}>{m.email}</Text>
              <Text style={styles.sub}>{m.card ? `Thẻ ${m.card}` : 'Chưa gán thẻ'}{present(m.id) ? ' · đang có mặt' : ''}</Text>
            </View>
            <View style={[styles.role, { backgroundColor: ROLE_COLOR[m.role] + '1A' }]}>
              <Text style={{ color: ROLE_COLOR[m.role], fontSize: 11, fontWeight: '700' }}>{m.role}</Text>
            </View>
            {admin ? (
              <Icon name="pencil-outline" size={20} color={colors.primary} style={{ marginLeft: 8 }}
                onPress={() => { setAdding(false); setEditing(m.id); setRole(m.role); setCard(m.card || ''); setError(''); }} />
            ) : null}
          </View>

          {editing === m.id ? (
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {ROLE_LIST.map((r) => <Chip key={r} label={r} active={role === r} color={ROLE_COLOR[r]} onPress={() => setRole(r)} />)}
              </View>
              <Input label="Mã thẻ RFID" icon="card-account-details-outline" placeholder="AA:BB:CC:DD" value={card} onChangeText={setCard} autoCapitalize="characters" error={error} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title="Xóa" variant="outline" icon="account-remove-outline" style={{ flex: 1 }}
                  onPress={() => confirmAction(`Xóa tài khoản ${m.name}?`, () => run(() => removeMember(m.id), `Xóa thành viên ${m.name}`).then((ok) => ok && setEditing(null)))} />
                <Button title="Lưu" icon="check" style={{ flex: 1 }} onPress={() => saveEdit(m)} />
              </View>
            </View>
          ) : null}
        </Card>
      ))}

      <SectionTitle title="Phân quyền" />
      <Card>
        {ROLE_LIST.map((r) => (
          <View key={r} style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: '700', color: ROLE_COLOR[r] }}>{r}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{ROLE_DESC[r]}</Text>
          </View>
        ))}
        <Text style={{ color: colors.muted, fontSize: 12 }}>Tài khoản demo: admin@office.vn · nhanvien@office.vn · khach@office.vn (mật khẩu {DEFAULT_PASSWORD})</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { marginBottom: 10, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  online: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  name: { fontWeight: '700', color: colors.text },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  role: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
});
