// Định nghĩa điều kiện (NẾU) và hành động (THÌ) cho quy tắc tự động.
// Quy tắc được lưu dạng có cấu trúc để bộ xử lý trong OfficeContext thực thi được:
//   { id, name, icon, enabled, cond: { key, value }, act: { key, roomId? } }
import { fmtTemp, isValidTime } from './time';

export const TRIGGERS = {
  temp: { icon: 'thermometer-high', label: 'Nhiệt độ vượt ngưỡng', sensor: 'temperature', op: '>', unit: '°C', def: 30 },
  hum: { icon: 'water-percent', label: 'Độ ẩm vượt ngưỡng', sensor: 'humidity', op: '>', unit: '%', def: 75 },
  gas: { icon: 'gas-cylinder', label: 'Phát hiện khí gas', sensor: 'gas', op: '>', unit: 'ppm', def: 400 },
  co2: { icon: 'molecule-co2', label: 'CO₂ cao (không khí bí)', sensor: 'co2', op: '>', unit: 'ppm', def: 1000 },
  light: { icon: 'white-balance-sunny', label: 'Ánh sáng yếu', sensor: 'light', op: '<', unit: 'lux', def: 200 },
  motion: { icon: 'motion-sensor', label: 'Phát hiện chuyển động', sensor: 'motion' },
  time: { icon: 'clock-outline', label: 'Theo giờ trong ngày', unit: 'giờ', def: '18:00' },
};

export const ACTIONS = {
  fan_on: { icon: 'fan', label: 'Bật quạt', type: 'fan', patch: { on: true } },
  fan_off: { icon: 'fan-off', label: 'Tắt quạt', type: 'fan', patch: { on: false } },
  ac_on: { icon: 'air-conditioner', label: 'Bật điều hòa', type: 'ac', patch: { on: true } },
  ac_off: { icon: 'snowflake-off', label: 'Tắt điều hòa', type: 'ac', patch: { on: false } },
  light_on: { icon: 'lightbulb-on-outline', label: 'Bật đèn', type: 'light', patch: { on: true } },
  light_off: { icon: 'lightbulb-off-outline', label: 'Tắt đèn', type: 'light', patch: { on: false } },
  door_lock: { icon: 'lock', label: 'Khóa cửa', type: 'door', patch: { locked: true } },
  curtain_open: { icon: 'curtains', label: 'Mở rèm', type: 'curtain', patch: { on: true, position: 100 } },
  curtain_close: { icon: 'curtains-closed', label: 'Đóng rèm', type: 'curtain', patch: { position: 0 } },
  alarm: { icon: 'alarm-light-outline', label: 'Bật còi + gửi cảnh báo' },
};

/** Câu mô tả điều kiện, đổi đơn vị nhiệt độ theo cài đặt */
export function triggerText(cond, unit = 'C') {
  const t = TRIGGERS[cond?.key];
  if (!t) return '';
  if (cond.key === 'motion') return 'Cảm biến PIR phát hiện chuyển động';
  if (cond.key === 'time') return `${cond.value} hằng ngày`;
  if (cond.key === 'temp') return `Nhiệt độ > ${fmtTemp(cond.value, unit)}`;
  return `${SHORT[cond.key]} ${t.op} ${cond.value} ${t.unit}`;
}

const SHORT = { hum: 'Độ ẩm', gas: 'Gas', co2: 'CO₂', light: 'Ánh sáng' };

/** Câu mô tả hành động, kèm tên phòng nếu chỉ áp dụng cho một phòng */
export function actionText(act, rooms = []) {
  const a = ACTIONS[act?.key];
  if (!a) return '';
  if (!a.type) return a.label;
  const room = rooms.find((r) => r.id === act.roomId);
  return room ? `${a.label} · ${room.name}` : `${a.label} (tất cả)`;
}

/** Kiểm tra điều kiện cảm biến có đang đúng không */
export function sensorMatches(cond, sensors) {
  const t = TRIGGERS[cond?.key];
  if (!t?.sensor) return false;
  const v = sensors[t.sensor];
  if (cond.key === 'motion') return !!v;
  if (typeof v !== 'number') return false;
  return t.op === '>' ? v > Number(cond.value) : v < Number(cond.value);
}

export function validateCond(key, value) {
  if (key === 'motion') return null;
  if (key === 'time') return isValidTime(value) ? null : 'Giờ phải có dạng HH:MM, VD 18:30';
  return value === '' || Number.isNaN(Number(value)) ? 'Ngưỡng phải là số' : null;
}

// ---- Chuyển quy tắc kiểu cũ (chỉ có chữ) sang dạng có cấu trúc ----
const LEGACY_ACTION = {
  'Bật tất cả quạt': 'fan_on',
  'Bật điều hòa': 'ac_on',
  'Bật đèn': 'light_on',
  'Tắt đèn': 'light_off',
  'Khóa tất cả cửa': 'door_lock',
  'Đóng rèm': 'curtain_close',
  'Bật còi + gửi thông báo': 'alarm',
  'Bật đèn sảnh': 'light_on',
};

export function migrateRule(a) {
  if (a.cond && a.act) return a;
  const tr = String(a.trigger || '');
  const num = (re) => Number((tr.match(re) || [])[1]);
  let cond = null;
  if (/Nhiệt độ/.test(tr)) cond = { key: 'temp', value: num(/([\d.]+)/) || 30 };
  else if (/Độ ẩm/.test(tr)) cond = { key: 'hum', value: num(/([\d.]+)/) || 75 };
  else if (/Gas/i.test(tr)) cond = { key: 'gas', value: num(/([\d.]+)/) || 400 };
  else if (/CO/.test(tr)) cond = { key: 'co2', value: num(/([\d.]+)/) || 1000 };
  else if (/Ánh sáng/.test(tr)) cond = { key: 'light', value: num(/([\d.]+)/) || 200 };
  else if (/PIR|chuyển động/i.test(tr)) cond = { key: 'motion' };
  else {
    const t = (tr.match(/(\d{1,2}:\d{2})/) || [])[1];
    cond = { key: 'time', value: t ? t.padStart(5, '0') : '18:00' };
  }
  const act = { key: LEGACY_ACTION[a.action] || 'alarm' };
  if (a.action === 'Bật đèn sảnh') act.roomId = 'r5';
  return { ...a, cond, act };
}
