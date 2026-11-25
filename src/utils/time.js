// Tiện ích thời gian / định dạng dùng chung

export const pad = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' theo giờ máy (không dùng toISOString vì lệch múi giờ UTC) */
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(n, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** 'HH:MM' */
export function hhmm(d = new Date()) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** '08:30' -> 510 (số phút tính từ 0h) */
export function toMin(t) {
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function fromMin(min) {
  const m = ((min % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export const isValidTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t).trim());

/** Nhãn ngày thân thiện: Hôm nay / Ngày mai / Hôm qua / 25/11 */
export function dateLabel(key) {
  if (key === dateKey()) return 'Hôm nay';
  if (key === addDays(1)) return 'Ngày mai';
  if (key === addDays(-1)) return 'Hôm qua';
  const [, m, d] = String(key).split('-');
  return `${d}/${m}`;
}

/** Thời gian tương đối cho thông báo */
export function relTime(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 172800) return 'Hôm qua';
  return new Date(ts).toLocaleDateString('vi-VN');
}

// ---- Nhiệt độ: dữ liệu luôn lưu bằng °C, chỉ đổi đơn vị khi hiển thị ----
export const cToF = (c) => c * 9 / 5 + 32;
export const fToC = (f) => (f - 32) * 5 / 9;

/** Đổi giá trị °C sang đơn vị đang chọn (làm tròn 1 chữ số) */
export function tempValue(c, unit = 'C') {
  if (c === undefined || c === null || Number.isNaN(Number(c))) return '--';
  const v = unit === 'F' ? cToF(Number(c)) : Number(c);
  return Math.round(v * 10) / 10;
}

/** '28.5°C' hoặc '83.3°F' */
export function fmtTemp(c, unit = 'C', withUnit = true) {
  const v = tempValue(c, unit);
  return withUnit ? `${v}°${unit}` : `${v}°`;
}
