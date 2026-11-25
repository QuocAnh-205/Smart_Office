// Dữ liệu mẫu ban đầu. Khi có ESP32 thật, trạng thái thiết bị sẽ được đồng bộ qua src/services/api.js
import { addDays, dateKey } from '../utils/time';

export const ROOMS = [
  { id: 'r1', name: 'Phòng làm việc chung', icon: 'desk', floor: 'Tầng 1', area: 80 },
  { id: 'r2', name: 'Phòng họp A', icon: 'account-group-outline', floor: 'Tầng 2', area: 40 },
  { id: 'r3', name: 'Phòng giám đốc', icon: 'briefcase-outline', floor: 'Tầng 2', area: 30, restricted: true },
  { id: 'r4', name: 'Pantry / Bếp', icon: 'coffee-outline', floor: 'Tầng 1', area: 20 },
  { id: 'r5', name: 'Sảnh lễ tân', icon: 'door-open', floor: 'Tầng 1', area: 35 },
];

export const DEVICES = [
  { id: 'd1', type: 'light', name: 'Đèn trần chính', roomId: 'r1', on: true, brightness: 80, colorTemp: 4500, power: 36 },
  { id: 'd2', type: 'light', name: 'Đèn bàn làm việc', roomId: 'r1', on: false, brightness: 60, colorTemp: 5500, power: 12 },
  { id: 'd3', type: 'light', name: 'Đèn phòng họp', roomId: 'r2', on: true, brightness: 100, colorTemp: 4000, power: 40 },
  { id: 'd4', type: 'light', name: 'Đèn sảnh', roomId: 'r5', on: true, brightness: 70, colorTemp: 3000, power: 24 },
  { id: 'd5', type: 'fan', name: 'Quạt trần', roomId: 'r1', on: true, speed: 2, mode: 'normal', swing: true, timer: 0, power: 55 },
  { id: 'd6', type: 'fan', name: 'Quạt đứng', roomId: 'r3', on: false, speed: 1, mode: 'natural', swing: false, timer: 0, power: 45 },
  { id: 'd7', type: 'ac', name: 'Điều hòa phòng họp', roomId: 'r2', on: false, temp: 25, mode: 'cool', fanSpeed: 'auto', power: 1200 },
  { id: 'd8', type: 'ac', name: 'Điều hòa giám đốc', roomId: 'r3', on: true, temp: 26, mode: 'cool', fanSpeed: 'low', power: 900 },
  { id: 'd9', type: 'freezer', name: 'Tủ đông lạnh Pantry', roomId: 'r4', on: true, freezerTemp: -18, fridgeTemp: 4, mode: 'normal', doorOpen: false, power: 150 },
  { id: 'd10', type: 'door', name: 'Cửa chính', roomId: 'r5', on: true, locked: true, power: 5 },
  { id: 'd11', type: 'door', name: 'Cửa phòng giám đốc', roomId: 'r3', on: true, locked: false, power: 5 },
  { id: 'd12', type: 'curtain', name: 'Rèm phòng họp', roomId: 'r2', on: true, position: 60, power: 20 },
  { id: 'd13', type: 'camera', name: 'Camera sảnh', roomId: 'r5', on: true, recording: true, motionAlert: true, night: false, streamUrl: '', power: 8 },
  { id: 'd14', type: 'camera', name: 'Camera hành lang', roomId: 'r1', on: true, recording: false, motionAlert: false, night: false, streamUrl: '', power: 8 },
];

export const SCENES = [
  { id: 's1', name: 'Bắt đầu ngày làm việc', icon: 'weather-sunny', color: '#F59E0B',
    actions: [{ type: 'light', on: true }, { type: 'ac', on: true }, { type: 'door', locked: false }] },
  { id: 's2', name: 'Chế độ họp', icon: 'presentation', color: '#4F6AF5',
    actions: [{ type: 'light', on: true }, { type: 'curtain', position: 0 }] },
  { id: 's3', name: 'Nghỉ trưa', icon: 'food-outline', color: '#22C55E',
    actions: [{ type: 'light', on: false }, { type: 'fan', on: true }] },
  { id: 's4', name: 'Tan làm', icon: 'weather-night', color: '#8B5CF6',
    actions: [{ type: 'light', on: false }, { type: 'fan', on: false }, { type: 'ac', on: false }, { type: 'door', locked: true }] },
];

// Quy tắc tự động: cond = điều kiện NẾU, act = hành động THÌ (xem src/utils/automation.js)
export const AUTOMATIONS = [
  { id: 'a1', name: 'Bật quạt khi nóng', icon: 'thermometer-high', enabled: true, cond: { key: 'temp', value: 30 }, act: { key: 'fan_on' } },
  { id: 'a2', name: 'Báo động rò rỉ khí gas', icon: 'gas-cylinder', enabled: true, cond: { key: 'gas', value: 400 }, act: { key: 'alarm' } },
  { id: 'a3', name: 'Bật đèn sảnh khi có người', icon: 'motion-sensor', enabled: false, cond: { key: 'motion' }, act: { key: 'light_on', roomId: 'r5' } },
  { id: 'a4', name: 'Tự khóa cửa buổi tối', icon: 'lock-clock', enabled: true, cond: { key: 'time', value: '19:00' }, act: { key: 'door_lock' } },
  { id: 'a5', name: 'Thông gió khi CO₂ cao', icon: 'molecule-co2', enabled: true, cond: { key: 'co2', value: 1000 }, act: { key: 'fan_on' } },
];

export const SCHEDULES = [
  { id: 'sc1', time: '07:30', days: [1, 2, 3, 4, 5], deviceId: 'd1', action: 'on', enabled: true },
  { id: 'sc2', time: '12:00', days: [1, 2, 3, 4, 5], deviceId: 'd5', action: 'on', enabled: true },
  { id: 'sc3', time: '18:00', days: [1, 2, 3, 4, 5, 6], deviceId: 'd7', action: 'off', enabled: false },
];

const ago = (min) => Date.now() - min * 60000;
export const makeNotifications = () => [
  { id: 'n1', type: 'warning', title: 'Nhiệt độ cao', message: 'Phòng làm việc chung đạt 31°C, đã tự động bật quạt.', ts: ago(5), read: false },
  { id: 'n2', type: 'danger', title: 'Cửa tủ đông chưa đóng', message: 'Tủ đông lạnh Pantry mở quá 2 phút.', ts: ago(30), read: false },
  { id: 'n3', type: 'info', title: 'Hẹn giờ', message: 'Đèn trần chính đã được bật lúc 07:30.', ts: ago(120), read: true },
  { id: 'n4', type: 'success', title: 'Thiết bị mới', message: 'Camera hành lang đã kết nối thành công.', ts: ago(1500), read: true },
];

// Chấm công mẫu của hôm nay (thành viên lấy từ danh sách tài khoản trong AuthContext)
export const makeAttendance = () => {
  const today = dateKey();
  return [
    { id: 'at1', date: today, userId: 'u1', checkIn: '07:52', checkOut: null, status: 'ontime' },
    { id: 'at2', date: today, userId: 'u2', checkIn: '08:14', checkOut: null, status: 'late' },
    { id: 'at3', date: today, userId: 'u3', checkIn: '07:58', checkOut: null, status: 'ontime' },
  ];
};

// Lịch họp mẫu: ngày lưu dạng YYYY-MM-DD, phòng lưu theo id để tự bật/tắt thiết bị đúng phòng
export const makeBookings = () => [
  { id: 'b1', roomId: 'r2', title: 'Họp giao ban tuần', date: dateKey(), start: '08:30', end: '09:30', host: 'Quản trị viên' },
  { id: 'b2', roomId: 'r2', title: 'Demo sản phẩm IoT', date: dateKey(), start: '14:00', end: '15:30', host: 'Trần Thị Bình' },
  { id: 'b3', roomId: 'r3', title: 'Tiếp khách đối tác', date: addDays(1), start: '10:00', end: '11:00', host: 'Lê Hoàng Cường' },
];

export const ENERGY_WEEK = [
  { day: 'T2', kwh: 18.2 }, { day: 'T3', kwh: 21.5 }, { day: 'T4', kwh: 19.8 }, { day: 'T5', kwh: 24.1 },
  { day: 'T6', kwh: 22.7 }, { day: 'T7', kwh: 9.4 }, { day: 'CN', kwh: 4.1 },
];
