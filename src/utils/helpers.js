import { Alert, Platform } from 'react-native';
import { DEVICE_META } from '../theme';

/** Hộp thoại xác nhận chạy được cả trên điện thoại lẫn web */
export function confirmAction(message, onOk, okText = 'Xóa') {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onOk();
    return;
  }
  Alert.alert('Xác nhận', message, [
    { text: 'Hủy', style: 'cancel' },
    { text: okText, style: 'destructive', onPress: onOk },
  ]);
}

/** Thông báo đơn giản chạy được cả trên điện thoại lẫn web */
export function showMessage(title, message) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export function describeAction(a) {
  const label = DEVICE_META[a.type].label;
  if ('locked' in a) return `${a.locked ? 'Khóa' : 'Mở'} ${label.toLowerCase()}`;
  if ('position' in a) return `${label} ${a.position}%`;
  return `${a.on ? 'Bật' : 'Tắt'} ${label.toLowerCase()}`;
}

export const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
