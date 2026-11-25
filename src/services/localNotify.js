// Thông báo đẩy cục bộ (hiện trên thanh thông báo của điện thoại) bằng expo-notifications.
// Chạy được trong Expo Go (chỉ push từ máy chủ mới cần development build).
// Trên web không có thông báo hệ thống: app dùng banner trong ứng dụng (components/Toast.js).
import { Platform, Vibration } from 'react-native';

let Notifications = null;
let ready = null;

function load() {
  if (Platform.OS === 'web') return null;
  if (!Notifications) {
    try {
      Notifications = require('expo-notifications');
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    } catch {
      Notifications = null;
    }
  }
  return Notifications;
}

/** Xin quyền và tạo kênh Android (chỉ chạy một lần) */
export function initLocalNotifications() {
  const N = load();
  if (!N) return Promise.resolve(false);
  if (!ready) {
    ready = (async () => {
      try {
        if (Platform.OS === 'android') {
          await N.setNotificationChannelAsync('alerts', {
            name: 'Cảnh báo văn phòng',
            importance: N.AndroidImportance.HIGH,
            vibrationPattern: [0, 300, 200, 300],
          });
        }
        const cur = await N.getPermissionsAsync();
        if (cur.granted) return true;
        const req = await N.requestPermissionsAsync();
        return !!req.granted;
      } catch {
        return false;
      }
    })();
  }
  return ready;
}

/** Hiện một thông báo hệ thống ngay lập tức */
export async function pushLocal(title, body, { sound = true } = {}) {
  const N = load();
  if (!N) return;
  const ok = await initLocalNotifications();
  if (!ok) return;
  try {
    await N.scheduleNotificationAsync({
      content: { title, body, sound: sound ? 'default' : undefined },
      trigger: Platform.OS === 'android' ? { channelId: 'alerts' } : null,
    });
  } catch {
    // bỏ qua: không làm hỏng luồng chính nếu thông báo lỗi
  }
}

export function vibrateAlert() {
  if (Platform.OS !== 'web') Vibration.vibrate([0, 300, 150, 300]);
}
