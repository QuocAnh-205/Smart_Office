// Đăng nhập bằng vân tay / khuôn mặt (sinh trắc học của điện thoại).
// - Cảm biến do hệ điều hành kiểm tra (expo-local-authentication); app không bao giờ thấy dữ liệu vân tay.
// - Tài khoản được gắn với vân tay lưu trong expo-secure-store (Keystore Android / Keychain iOS),
//   kèm "dấu" mật khẩu lúc bật: đổi/đặt lại mật khẩu ở nơi khác thì vân tay tự hết hiệu lực.
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const KEY = 'so_bio_login';

/** Kiểm tra máy có cảm biến và đã đăng ký vân tay/khuôn mặt trong Cài đặt hệ thống chưa */
export async function getBiometricStatus() {
  if (Platform.OS === 'web') return { available: false, reason: 'Trình duyệt web không hỗ trợ sinh trắc học. Hãy dùng app trên điện thoại.', label: 'Vân tay' };
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const T = LocalAuthentication.AuthenticationType;
    const label = types.includes(T.FINGERPRINT) || !types.length ? 'Vân tay'
      : types.includes(T.FACIAL_RECOGNITION) ? 'Khuôn mặt' : 'Sinh trắc học';
    if (!hardware) return { available: false, reason: 'Điện thoại này không có cảm biến vân tay.', label };
    if (!enrolled) return { available: false, reason: `Bạn chưa đăng ký ${label.toLowerCase()} trong Cài đặt của điện thoại.`, label };
    return { available: true, reason: null, label };
  } catch {
    return { available: false, reason: 'Không đọc được cảm biến sinh trắc học.', label: 'Vân tay' };
  }
}

const ERRORS = {
  user_cancel: null, // người dùng tự hủy: không báo lỗi
  system_cancel: null,
  app_cancel: null,
  user_fallback: null,
  lockout: 'Quét sai quá nhiều lần, cảm biến tạm khóa. Hãy thử lại sau hoặc đăng nhập bằng mật khẩu.',
  not_enrolled: 'Bạn chưa đăng ký vân tay trong Cài đặt của điện thoại.',
  not_available: 'Cảm biến sinh trắc học không khả dụng.',
  passcode_not_set: 'Điện thoại chưa đặt mã khóa màn hình nên không dùng được vân tay.',
  authentication_failed: 'Vân tay không khớp.',
  timeout: 'Hết thời gian quét vân tay.',
};

/**
 * Hiện hộp thoại quét vân tay của hệ thống.
 * Chỉ chấp nhận sinh trắc học (không cho thay bằng mã khóa màn hình), để đúng nghĩa "đăng nhập bằng vân tay".
 * @returns {Promise<{ ok: boolean, error: string|null }>} error = null khi người dùng tự hủy
 */
export async function scanBiometric(promptMessage) {
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage,
      promptSubtitle: 'Smart Office',
      cancelLabel: 'Dùng mật khẩu',
      fallbackLabel: '',
      disableDeviceFallback: true,
      requireConfirmation: false,
    });
    if (r.success) return { ok: true, error: null };
    return { ok: false, error: r.error in ERRORS ? ERRORS[r.error] : 'Xác thực vân tay thất bại, hãy thử lại.' };
  } catch {
    return { ok: false, error: 'Không mở được cảm biến vân tay.' };
  }
}

/** Tài khoản đang gắn với vân tay trên máy này: { id, email, name, pw } hoặc null */
export async function getBiometricAccount() {
  if (Platform.OS === 'web') return null;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveBiometricAccount(user) {
  await SecureStore.setItemAsync(KEY, JSON.stringify({ id: user.id, email: user.email, name: user.name, pw: user.password }));
}

export async function clearBiometricAccount() {
  if (Platform.OS === 'web') return;
  try { await SecureStore.deleteItemAsync(KEY); } catch { /* không có thì thôi */ }
}
