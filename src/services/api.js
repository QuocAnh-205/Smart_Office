// Lớp giao tiếp với vi điều khiển ESP32 / ESP8266 qua HTTP REST.
// Firmware mẫu: ../arduino/SmartOffice_ESP32/SmartOffice_ESP32.ino
//
//   GET  {baseUrl}/api/status            -> { ok, name, devices: [{ id, on, brightness, speed, locked, position }] }
//   GET  {baseUrl}/api/sensors           -> { temperature, humidity, gas, light, co2, motion }
//   GET  {baseUrl}/api/events?since=N    -> { last, events: [{ seq, type: "rfid", uid, granted }] }
//   POST {baseUrl}/api/device/{id}       body: { ...trạng thái mới }  -> { ok: true }
//   (id đặc biệt "buzzer": { on: true, seconds: 5 } để kêu còi báo động)
//
// Khi bật "Chế độ mô phỏng" trong Cài đặt, app không gọi mạng mà sinh dữ liệu giả.

const TIMEOUT_MS = 4000;

async function request(baseUrl, path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function pingServer(baseUrl) {
  return request(baseUrl, '/api/status');
}

/** Đọc trạng thái hiện tại của các thiết bị trên ESP32 (đồng bộ ESP32 -> app khi mới kết nối) */
export const fetchStatus = pingServer;

/** Lấy các sự kiện mới phát sinh trên mạch (quẹt thẻ RFID...) kể từ số thứ tự `since` */
export function fetchEvents(baseUrl, since = 0) {
  return request(baseUrl, `/api/events?since=${since}`);
}

export function fetchSensors(baseUrl) {
  return request(baseUrl, '/api/sensors');
}

export function sendDeviceCommand(baseUrl, deviceId, state) {
  return request(baseUrl, `/api/device/${deviceId}`, {
    method: 'POST',
    body: JSON.stringify(state),
  });
}

// Sinh dữ liệu cảm biến mô phỏng, dao động nhẹ quanh giá trị trước đó
export function simulateSensors(prev) {
  const drift = (v, d, min, max) => Math.min(max, Math.max(min, +(v + (Math.random() - 0.5) * d).toFixed(1)));
  return {
    temperature: drift(prev.temperature, 0.6, 22, 34),
    humidity: drift(prev.humidity, 1.5, 45, 85),
    gas: Math.round(drift(prev.gas, 20, 80, 450)),
    light: Math.round(drift(prev.light, 40, 100, 900)),
    co2: Math.round(drift(prev.co2, 30, 400, 1200)),
    motion: Math.random() > 0.7,
  };
}
