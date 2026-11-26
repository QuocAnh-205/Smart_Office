import { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { check, ROLES } from '../utils/permissions';
import { clearBiometricAccount, getBiometricAccount, getBiometricStatus, saveBiometricAccount, scanBiometric } from '../services/biometric';

const AuthContext = createContext(null);

const USERS_KEY = '@so_users';
const SESSION_KEY = '@so_session';
const ONBOARD_KEY = '@so_onboarded';
export const DEFAULT_PASSWORD = '123456';

// Tài khoản demo có sẵn, mỗi vai trò một tài khoản để thử phân quyền.
// card = UID thẻ RFID dùng để chấm công / mở cửa (trùng với firmware).
const DEFAULT_USERS = [
  { id: 'u1', name: 'Quản trị viên', email: 'admin@office.vn', phone: '0900000000', password: DEFAULT_PASSWORD, role: ROLES.ADMIN, department: 'Phòng IT', card: '3A:7F:22:91' },
  { id: 'u2', name: 'Trần Thị Bình', email: 'nhanvien@office.vn', phone: '0900000001', password: DEFAULT_PASSWORD, role: ROLES.STAFF, department: 'Kế toán', card: '9C:12:AB:04' },
  { id: 'u3', name: 'Lê Hoàng Cường', email: 'cuong.le@office.vn', phone: '0900000002', password: DEFAULT_PASSWORD, role: ROLES.STAFF, department: 'Kinh doanh', card: '51:EE:30:7D' },
  { id: 'u4', name: 'Phạm Minh Dũng', email: 'khach@office.vn', phone: '0900000003', password: DEFAULT_PASSWORD, role: ROLES.GUEST, department: 'Đối tác', card: '06:4B:C9:18' },
];

const sameEmail = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Gộp tài khoản đã lưu với tài khoản demo (bổ sung tài khoản/trường mới khi nâng cấp app) */
function mergeUsers(saved) {
  const list = saved.map((u) => {
    const def = DEFAULT_USERS.find((d) => d.id === u.id);
    return def ? { ...def, ...u, card: u.card ?? def.card } : u;
  });
  DEFAULT_USERS.forEach((d) => {
    if (!list.some((u) => u.id === d.id || sameEmail(u.email, d.email))) list.push(d);
  });
  return list;
}

export function AuthProvider({ children }) {
  const [users, setUsersState] = useState(DEFAULT_USERS);
  const usersRef = useRef(DEFAULT_USERS);
  const setUsers = (l) => { usersRef.current = l; setUsersState(l); };
  const [user, setUserState] = useState(null);
  // Luôn giữ người dùng mới nhất: hàm gọi ngay sau login() vẫn thấy tài khoản vừa đăng nhập
  // (state React chỉ cập nhật ở lần render sau)
  const userRef = useRef(null);
  const setUser = (u) => { userRef.current = u; setUserState(u); };
  const [onboarded, setOnboarded] = useState(false);
  const [ready, setReady] = useState(false);
  // false = không "Ghi nhớ đăng nhập": phiên chỉ giữ trong lần mở app này, không ghi xuống bộ nhớ
  const persistRef = useRef(true);
  // Tài khoản gắn với vân tay trên máy này ({ id, email, name, pw }) hoặc null
  const [bioAccount, setBioAccount] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setBioAccount(await getBiometricAccount());
        const [u, s, o] = await AsyncStorage.multiGet([USERS_KEY, SESSION_KEY, ONBOARD_KEY]);
        const list = u[1] ? mergeUsers(JSON.parse(u[1])) : DEFAULT_USERS;
        setUsers(list);
        if (s[1]) {
          // Lấy bản mới nhất trong danh sách (vai trò có thể đã bị Quản trị viên đổi)
          const sess = JSON.parse(s[1]);
          setUser(list.find((x) => x.id === sess.id) || null);
        }
        setOnboarded(o[1] === '1');
      } catch (e) {
        console.warn('Không đọc được dữ liệu đăng nhập', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const saveUsers = async (list) => {
    setUsers(list);
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(list));
    // Đồng bộ phiên đăng nhập hiện tại nếu tài khoản của mình bị sửa
    const cur = userRef.current;
    if (cur) {
      const me = list.find((x) => x.id === cur.id);
      if (me) {
        setUser(me);
        if (persistRef.current) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ id: me.id }));
      }
    }
  };

  const saveSession = async (u, persist = true) => {
    persistRef.current = persist;
    setUser(u);
    if (u && persist) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ id: u.id }));
    else await AsyncStorage.removeItem(SESSION_KEY);
  };

  const finishOnboarding = async () => {
    setOnboarded(true);
    await AsyncStorage.setItem(ONBOARD_KEY, '1');
  };

  const login = async (email, password, remember = true) => {
    const found = users.find((u) => sameEmail(u.email, email));
    if (!found) throw new Error('Email chưa được đăng ký');
    if (found.password !== password) throw new Error('Mật khẩu không đúng');
    await saveSession(found, remember);
    return found;
  };

  const register = async ({ name, email, phone, password, department }) => {
    if (users.some((u) => sameEmail(u.email, email))) throw new Error('Email này đã được sử dụng');
    const newUser = {
      id: 'u' + Date.now(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      department: department?.trim() || 'Chưa cập nhật',
      role: ROLES.STAFF,
      card: null,
    };
    await saveUsers([...users, newUser]);
    await saveSession(newUser);
    return newUser;
  };

  const logout = () => saveSession(null);

  const updateProfile = async (patch) => {
    // Người dùng tự sửa hồ sơ: không được tự đổi vai trò / thẻ
    const { role: _r, card: _c, ...safe } = patch;
    const me = userRef.current;
    if (!me) throw new Error('Bạn cần đăng nhập trước');
    const updated = { ...me, ...safe };
    await saveUsers(usersRef.current.map((u) => (u.id === me.id ? updated : u)));
  };

  const changePassword = async (oldPass, newPass) => {
    const me = userRef.current;
    if (!me) throw new Error('Bạn cần đăng nhập trước');
    if (me.password !== oldPass) throw new Error('Mật khẩu hiện tại không đúng');
    await updateProfile({ password: newPass });
    // Chính chủ đổi mật khẩu (đã chứng minh biết mật khẩu cũ) thì giữ vân tay, cập nhật dấu mật khẩu
    const acc = await getBiometricAccount();
    if (acc?.id === me.id) {
      const next = { ...me, password: newPass };
      await saveBiometricAccount(next);
      setBioAccount(await getBiometricAccount());
    }
  };

  // ---- Đăng nhập bằng vân tay ----
  const biometricStatus = getBiometricStatus; // hàm cố định, dùng an toàn trong useEffect

  const disableBiometric = async () => {
    await clearBiometricAccount();
    setBioAccount(null);
  };

  /** Bật vân tay cho tài khoản đang đăng nhập: phải quét đúng vân tay đã đăng ký trên máy */
  const enableBiometric = async (account) => {
    const me = account || userRef.current;
    if (!me) throw new Error('Bạn cần đăng nhập trước');
    const st = await getBiometricStatus();
    if (!st.available) throw new Error(st.reason);
    const r = await scanBiometric(`Quét ${st.label.toLowerCase()} để bật đăng nhập nhanh`);
    if (!r.ok) {
      if (r.error) throw new Error(r.error);
      return false; // người dùng hủy
    }
    // Lấy bản mới nhất (có mật khẩu hiện tại) để làm dấu mật khẩu
    await saveBiometricAccount(usersRef.current.find((u) => u.id === me.id) || me);
    setBioAccount(await getBiometricAccount());
    return true;
  };

  /**
   * Đăng nhập bằng vân tay. Trả về user, hoặc null nếu người dùng hủy hộp thoại.
   * Từ chối nếu tài khoản đã bị xóa hoặc mật khẩu đã bị đổi/đặt lại kể từ lúc bật vân tay.
   */
  const loginWithBiometric = async (remember = true) => {
    const st = await getBiometricStatus();
    if (!st.available) throw new Error(st.reason);
    const acc = await getBiometricAccount();
    if (!acc) throw new Error(`Chưa bật đăng nhập bằng ${st.label.toLowerCase()} trên máy này. Hãy đăng nhập bằng mật khẩu, rồi bật trong Cài đặt → Bảo mật.`);
    const r = await scanBiometric(`Đăng nhập ${acc.email}`);
    if (!r.ok) {
      if (r.error) throw new Error(r.error);
      return null;
    }
    const found = usersRef.current.find((u) => u.id === acc.id);
    if (!found || found.password !== acc.pw) {
      await disableBiometric();
      throw new Error(found
        ? 'Mật khẩu tài khoản đã thay đổi nên vân tay hết hiệu lực. Hãy đăng nhập bằng mật khẩu mới rồi bật lại.'
        : 'Tài khoản gắn với vân tay không còn tồn tại.');
    }
    await saveSession(found, remember);
    return found;
  };

  const emailExists = (email) => users.some((u) => sameEmail(u.email, email));

  const resetPassword = async (email, newPass) => {
    await saveUsers(users.map((u) => (sameEmail(u.email, email) ? { ...u, password: newPass } : u)));
  };

  // ---- Quản lý thành viên (chỉ Quản trị viên) ----
  const requireAdmin = () => {
    const r = check(user, 'member.manage');
    if (!r.ok) throw new Error(r.reason);
  };

  const normCard = (c) => (c ? c.trim().toUpperCase() : null);

  const addMember = async ({ name, email, role, card, department }) => {
    requireAdmin();
    if (users.some((u) => sameEmail(u.email, email))) throw new Error('Email này đã có trong hệ thống');
    const uid = normCard(card);
    if (uid && users.some((u) => u.card === uid)) throw new Error('Mã thẻ RFID đã được gán cho người khác');
    const m = {
      id: 'u' + Date.now(),
      name: name.trim(),
      email: email.trim(),
      phone: '',
      password: DEFAULT_PASSWORD,
      role,
      department: department?.trim() || 'Chưa cập nhật',
      card: uid,
    };
    await saveUsers([...users, m]);
    return m;
  };

  const updateMember = async (id, patch) => {
    requireAdmin();
    if (id === user.id && patch.role && patch.role !== user.role) throw new Error('Không thể tự đổi vai trò của chính mình');
    const next = { ...patch };
    if ('card' in next) {
      next.card = normCard(next.card);
      if (next.card && users.some((u) => u.id !== id && u.card === next.card)) throw new Error('Mã thẻ RFID đã được gán cho người khác');
    }
    await saveUsers(users.map((u) => (u.id === id ? { ...u, ...next } : u)));
  };

  const removeMember = async (id) => {
    requireAdmin();
    if (id === user.id) throw new Error('Không thể xóa tài khoản đang đăng nhập');
    const target = users.find((u) => u.id === id);
    if (target?.role === ROLES.ADMIN && users.filter((u) => u.role === ROLES.ADMIN).length <= 1) {
      throw new Error('Hệ thống phải còn ít nhất một Quản trị viên');
    }
    await saveUsers(users.filter((u) => u.id !== id));
  };

  return (
    <AuthContext.Provider
      value={{
        user, users, ready, onboarded, finishOnboarding, login, register, logout, updateProfile, changePassword, emailExists, resetPassword,
        addMember, updateMember, removeMember,
        bioAccount, biometricStatus, enableBiometric, disableBiometric, loginWithBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
