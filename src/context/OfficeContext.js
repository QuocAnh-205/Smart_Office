import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AUTOMATIONS, DEVICES, makeAttendance, makeBookings, makeNotifications, ROOMS, SCENES, SCHEDULES,
} from '../data/mock';
import { fetchEvents, fetchSensors, fetchStatus, sendDeviceCommand, simulateSensors } from '../services/api';
import { initLocalNotifications, pushLocal, vibrateAlert } from '../services/localNotify';
import { createMqttClient } from '../services/mqtt';
import { DEVICE_META } from '../theme';
import { ACTIONS, actionText, migrateRule, sensorMatches, triggerText } from '../utils/automation';
import { showMessage } from '../utils/helpers';
import { check } from '../utils/permissions';
import { dateKey, fmtTemp, hhmm, tempValue, toMin } from '../utils/time';
import { useAuth } from './AuthContext';

const OfficeContext = createContext(null);
const STORE_KEY = '@so_office_state_v1';

const DEFAULT_SETTINGS = {
  serverUrl: 'http://192.168.1.100',
  mockMode: true,
  // 'http': gọi thẳng IP của ESP32 trong mạng LAN · 'mqtt': qua broker (dùng cho Wokwi / Internet)
  transport: 'mqtt',
  mqttUrl: 'wss://broker.hivemq.com:8884/mqtt',
  mqttTopic: 'smartoffice/so-8f3k2q',
  pushNotify: true,
  sound: true,
  autoRefresh: true,
  tempUnit: 'C',
  doorPin: '1234',
};

// Cấu hình hệ thống: chỉ Quản trị viên được đổi. Các mục còn lại là tùy chọn cá nhân.
const SYSTEM_KEYS = ['serverUrl', 'mockMode', 'transport', 'mqttUrl', 'mqttTopic', 'doorPin'];

// Chỉ các trường này được gửi xuống ESP32, còn lại (tên, phòng, hẹn giờ...) chỉ app dùng
const SYNC_KEYS = ['on', 'locked', 'brightness', 'speed', 'position', 'temp', 'mode', 'fanSpeed', 'freezerTemp', 'fridgeTemp', 'doorOpen', 'recording', 'swing'];
const pickSync = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => SYNC_KEYS.includes(k)));

export const FREEZER_DOOR_LIMIT_SEC = 60;     // cửa tủ đông mở quá 60 giây thì cảnh báo
export const MEETING_PREP_MIN = 10;           // bật đèn + điều hòa trước giờ họp 10 phút
export const RFID_UNLOCK_SEC = 5;             // quẹt thẻ hợp lệ: mở cửa chính 5 giây rồi tự khóa
const MAIN_DOOR_ID = 'd10';
const FREEZER_ID = 'd9';                      // tủ đông nối reed switch trên mạch
const RULE_COOLDOWN_MS = 60000;
const PIN_MAX_FAIL = 3;
const PIN_LOCK_MS = 30000;
const WORK_HOURS = { from: 7, to: 18 };       // ngoài giờ này camera cảnh báo chuyển động

const nowStr = () => hhmm();

export function OfficeProvider({ children }) {
  const { user, users } = useAuth();
  const [rooms, setRooms] = useState(ROOMS);
  const [devices, setDevices] = useState(DEVICES);
  const [scenes, setScenes] = useState(SCENES);
  const [automations, setAutomations] = useState(AUTOMATIONS);
  const [schedules, setSchedules] = useState(SCHEDULES);
  const [notifications, setNotifications] = useState(makeNotifications);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [history, setHistory] = useState([]);
  const [bookings, setBookings] = useState(makeBookings);
  const [attendance, setAttendance] = useState(makeAttendance);
  const [sensorData, setSensorData] = useState({
    current: { temperature: 28.5, humidity: 65, gas: 150, light: 420, co2: 650, motion: false },
    history: [],
  });
  const sensors = sensorData.current;
  const sensorHistory = sensorData.history;
  const [connected, setConnected] = useState(true);
  const [boardInfo, setBoardInfo] = useState(null);
  const [toast, setToast] = useState(null);
  const [pinRequest, setPinRequest] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Bản sao mới nhất của state cho các bộ hẹn giờ / MQTT callback (tránh closure cũ)
  const mqttRef = useRef(null);
  const settingsRef = useRef(settings);
  const devicesRef = useRef(devices);
  const roomsRef = useRef(rooms);
  const automationsRef = useRef(automations);
  const schedulesRef = useRef(schedules);
  const bookingsRef = useRef(bookings);
  const attendanceRef = useRef(attendance);
  const userRef = useRef(user);
  const usersRef = useRef(users);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { devicesRef.current = devices; }, [devices]);
  useEffect(() => { roomsRef.current = rooms; }, [rooms]);
  useEffect(() => { automationsRef.current = automations; }, [automations]);
  useEffect(() => { schedulesRef.current = schedules; }, [schedules]);
  useEffect(() => { bookingsRef.current = bookings; }, [bookings]);
  useEffect(() => { attendanceRef.current = attendance; }, [attendance]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { usersRef.current = users; }, [users]);

  // Cập nhật giá trị cảm biến và lưu lại tối đa 20 lần đo gần nhất
  const pushSensors = useCallback((fn) => {
    setSensorData((p) => {
      const next = fn(p.current);
      return { current: next, history: [...p.history.slice(-19), { t: nowStr(), ...next }] };
    });
  }, []);

  // ---- Đọc / ghi dữ liệu cục bộ ----
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORE_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          // Bổ sung trường mới cho phòng mặc định (VD: restricted của phòng giám đốc)
          s.rooms && setRooms(s.rooms.map((r) => {
            const def = ROOMS.find((x) => x.id === r.id);
            return def ? { ...def, ...r, restricted: r.restricted ?? def.restricted } : r;
          }));
          s.devices && setDevices(s.devices);
          s.scenes && setScenes(s.scenes);
          s.automations && setAutomations(s.automations.map(migrateRule));
          s.schedules && setSchedules(s.schedules);
          s.notifications && setNotifications(s.notifications);
          s.history && setHistory(s.history);
          s.bookings && setBookings(s.bookings);
          s.attendance && setAttendance(s.attendance);
          s.settings && setSettings({ ...DEFAULT_SETTINGS, ...s.settings });
        }
      } catch (e) {
        console.warn('Không đọc được dữ liệu', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(
      STORE_KEY,
      JSON.stringify({ rooms, devices, scenes, automations, schedules, notifications, history, bookings, attendance, settings }),
    ).catch(() => {});
  }, [loaded, rooms, devices, scenes, automations, schedules, notifications, history, bookings, attendance, settings]);

  // Xin quyền thông báo hệ thống khi bật "Thông báo đẩy" (chỉ trên điện thoại)
  useEffect(() => {
    if (loaded && settings.pushNotify && Platform.OS !== 'web') initLocalNotifications();
  }, [loaded, settings.pushNotify]);

  // ---- Lịch sử thao tác & thông báo ----
  const log = useCallback((text, icon = 'information-outline') => {
    const u = userRef.current;
    setHistory((h) => [{
      id: String(Date.now() + Math.random()), text, icon, time: nowStr(), date: new Date().toLocaleDateString('vi-VN'), by: u?.name,
    }, ...h].slice(0, 200));
  }, []);

  /**
   * Tạo thông báo. Luôn lưu vào trung tâm thông báo; nếu bật "Thông báo đẩy" thì:
   *  - app đang mở: hiện banner ở đầu màn hình
   *  - app chạy nền (điện thoại): hiện thông báo hệ thống
   * "Âm thanh cảnh báo": rung + chuông với cảnh báo nguy hiểm.
   */
  const notify = useCallback((type, title, message) => {
    const n = { id: String(Date.now() + Math.random()), type, title, message, ts: Date.now(), read: false };
    setNotifications((list) => [n, ...list].slice(0, 100));
    const st = settingsRef.current;
    if (st.pushNotify) {
      if (AppState.currentState === 'active' || Platform.OS === 'web') setToast(n);
      else pushLocal(title, message, { sound: st.sound });
    }
    if (st.sound && type === 'danger') vibrateAlert();
  }, []);

  const deny = useCallback((reason) => showMessage('Không có quyền', reason), []);
  /** Kiểm tra quyền, báo lỗi nếu không được phép */
  const allow = useCallback((action, ctx) => {
    const r = check(userRef.current, action, ctx);
    if (!r.ok) deny(r.reason);
    return r.ok;
  }, [deny]);
  /** Kiểm tra quyền không báo lỗi (để ẩn/hiện nút) */
  const can = useCallback((action, ctx) => check(user, action, ctx).ok, [user]);

  // ---- Gửi lệnh xuống ESP32 ----
  const baseTopic = () => settingsRef.current.mqttTopic.replace(/\/$/, '');
  const sendToBoard = useCallback((id, patch) => {
    const st = settingsRef.current;
    if (st.mockMode) return;
    const body = id === 'buzzer' ? patch : pickSync(patch);
    if (!Object.keys(body).length) return;
    if (st.transport === 'mqtt') {
      mqttRef.current?.publish(`${baseTopic()}/cmd/${id}`, JSON.stringify(body));
    } else {
      sendDeviceCommand(st.serverUrl, id, body)
        .then(() => setConnected(true))
        .catch(() => setConnected(false));
    }
  }, []);

  /**
   * Áp dụng thay đổi cho thiết bị (nội bộ, KHÔNG kiểm tra quyền).
   * Dùng cho tự động hóa, hẹn giờ, RFID và sau khi đã kiểm tra quyền ở các hàm public.
   * opts.fromBoard = true: thay đổi do mạch báo lên, không gửi ngược lại.
   */
  const applyPatch = useCallback((id, patch, logText, opts = {}) => {
    const target = devicesRef.current.find((d) => d.id === id);
    if (!target) return;
    const extra = {};
    if (target.type === 'freezer' && 'doorOpen' in patch && patch.doorOpen !== target.doorOpen) {
      extra.doorOpenAt = patch.doorOpen ? Date.now() : null;
    }
    if (target.type === 'fan' && patch.on === false) { extra.timer = 0; extra.timerEnd = null; }
    const merged = { ...target, ...patch, ...extra };
    devicesRef.current = devicesRef.current.map((d) => (d.id === id ? merged : d));
    setDevices((list) => list.map((d) => (d.id === id ? { ...d, ...patch, ...extra } : d)));
    if (logText) log(logText, DEVICE_META[target.type]?.icon);
    if (!opts.fromBoard) sendToBoard(id, patch);
  }, [log, sendToBoard]);

  // ---- Mã PIN mở cửa (dùng chung cho mọi nơi) ----
  const pinFail = useRef({ count: 0, until: 0 });

  const requestPin = useCallback((title, subtitle, onSuccess) => {
    setPinRequest({ id: Date.now(), title, subtitle, onSuccess });
  }, []);

  const cancelPin = useCallback(() => setPinRequest(null), []);

  /** @returns {'ok' | 'wrong' | 'locked'} */
  const submitPin = useCallback((code) => {
    const f = pinFail.current;
    if (Date.now() < f.until) return 'locked';
    if (code === settingsRef.current.doorPin) {
      f.count = 0;
      const req = pinRequest;
      setPinRequest(null);
      req?.onSuccess?.();
      return 'ok';
    }
    f.count += 1;
    if (f.count >= PIN_MAX_FAIL) {
      f.count = 0;
      f.until = Date.now() + PIN_LOCK_MS;
      notify('warning', 'Nhập sai mã PIN', `Sai mã PIN ${PIN_MAX_FAIL} lần liên tiếp (${userRef.current?.name}). Bàn phím bị khóa ${PIN_LOCK_MS / 1000} giây.`);
      log(`Nhập sai mã PIN ${PIN_MAX_FAIL} lần`, 'shield-alert-outline');
      return 'locked';
    }
    return 'wrong';
  }, [pinRequest, notify, log]);

  const pinLockedFor = useCallback(() => Math.max(0, Math.ceil((pinFail.current.until - Date.now()) / 1000)), []);

  /** Lọc các cửa người dùng được phép mở; báo lý do nếu không được cửa nào */
  const permittedDoors = useCallback((ids) => {
    const ok = [];
    const reasons = [];
    ids.forEach((id) => {
      const d = devicesRef.current.find((x) => x.id === id);
      const room = roomsRef.current.find((r) => r.id === d?.roomId);
      const r = check(userRef.current, 'door.unlock', { room });
      if (r.ok) ok.push(id);
      else reasons.push(r.reason);
    });
    return { ok, reasons };
  }, []);

  /** Mở khóa một hoặc nhiều cửa: kiểm tra quyền rồi hỏi mã PIN */
  const requestUnlock = useCallback((ids, then) => {
    const { ok, reasons } = permittedDoors(ids);
    if (!ok.length) { deny(reasons[0]); return; }
    const names = ok.map((id) => devicesRef.current.find((d) => d.id === id)?.name).join(', ');
    const skipped = ids.length - ok.length;
    requestPin(`Mở khóa ${ok.length > 1 ? `${ok.length} cửa` : names}`, skipped ? `Bỏ qua ${skipped} cửa không đủ quyền` : 'Nhập mã PIN để xác nhận', () => {
      ok.forEach((id) => {
        const d = devicesRef.current.find((x) => x.id === id);
        applyPatch(id, { locked: false }, `Mở khóa ${d.name} (mã PIN)`);
      });
      then?.(ok);
    });
  }, [permittedDoors, deny, requestPin, applyPatch]);

  // ---- Điều khiển thiết bị (public: có kiểm tra quyền) ----
  const updateDevice = useCallback((id, patch, logText) => {
    const target = devicesRef.current.find((d) => d.id === id);
    if (!target) return;
    if (target.type === 'door' && patch.locked === false) { requestUnlock([id]); return; }
    const onlyLock = target.type === 'door' && Object.keys(patch).every((k) => k === 'locked');
    if (!allow(onlyLock ? 'door.lock' : 'device.control')) return;
    applyPatch(id, patch, logText);
  }, [allow, applyPatch, requestUnlock]);

  const toggleDevice = useCallback((id) => {
    const d = devicesRef.current.find((x) => x.id === id);
    if (!d) return;
    if (d.type === 'door') {
      if (d.locked) requestUnlock([id]);
      else if (allow('door.lock')) applyPatch(id, { locked: true }, `Khóa ${d.name}`);
      return;
    }
    if (!allow('device.control')) return;
    applyPatch(id, { on: !d.on }, `${d.on ? 'Tắt' : 'Bật'} ${d.name}`);
  }, [allow, applyPatch, requestUnlock]);

  const setAllOfType = useCallback((type, patch, text) => {
    const list = devicesRef.current.filter((d) => d.type === type);
    if (type === 'door' && patch.locked === false) {
      requestUnlock(list.map((d) => d.id), () => text && log(text, 'lock-open-variant'));
      return;
    }
    if (!allow(type === 'door' ? 'door.lock' : 'device.control')) return;
    list.forEach((d) => applyPatch(d.id, patch));
    if (text) log(text, DEVICE_META[type]?.icon);
  }, [allow, applyPatch, requestUnlock, log]);

  /** Bật/tắt toàn bộ thiết bị điện trong một phòng (trừ cửa, camera, tủ đông) */
  const setRoomPower = useCallback((roomId, on) => {
    if (!allow('device.control')) return;
    const room = roomsRef.current.find((r) => r.id === roomId);
    devicesRef.current
      .filter((d) => d.roomId === roomId && !['door', 'camera', 'freezer'].includes(d.type))
      .forEach((d) => applyPatch(d.id, { on }));
    log(`${on ? 'Bật' : 'Tắt'} tất cả thiết bị ${room?.name}`, on ? 'power' : 'power-off');
  }, [allow, applyPatch, log]);

  /** Hẹn giờ tắt quạt: lưu thời điểm kết thúc, bộ đếm của app sẽ tự tắt */
  const setFanTimer = useCallback((id, minutes) => {
    if (!allow('device.control')) return;
    const d = devicesRef.current.find((x) => x.id === id);
    applyPatch(id, { timer: minutes, timerEnd: minutes ? Date.now() + minutes * 60000 : null },
      minutes ? `Hẹn tắt ${d?.name} sau ${minutes} phút` : `Hủy hẹn giờ tắt ${d?.name}`);
  }, [allow, applyPatch]);

  /** Kêu còi báo động trên mạch ESP32 */
  const soundAlarm = useCallback((seconds = 5) => {
    sendToBoard('buzzer', { on: true, seconds });
  }, [sendToBoard]);

  const triggerAlarm = useCallback((source) => {
    if (!allow('device.control')) return;
    soundAlarm(5);
    log(`Kích hoạt còi báo động (${source})`, 'alarm-light-outline');
    notify('danger', 'Báo động thủ công', `${userRef.current?.name} đã bật còi báo động từ ${source}.`);
  }, [allow, soundAlarm, log, notify]);

  // ---- Quản lý thiết bị ----
  const addDevice = useCallback((device) => {
    if (!allow('device.manage')) return false;
    const meta = DEVICE_META[device.type];
    const defaults = {
      light: { brightness: 80, colorTemp: 4500, power: 20 },
      fan: { speed: 1, mode: 'normal', swing: false, timer: 0, power: 50 },
      ac: { temp: 25, mode: 'cool', fanSpeed: 'auto', power: 1000 },
      freezer: { freezerTemp: -18, fridgeTemp: 4, mode: 'normal', doorOpen: false, power: 150 },
      door: { locked: true, power: 5 },
      curtain: { position: 0, power: 20 },
      camera: { recording: false, motionAlert: false, night: false, streamUrl: '', power: 8 },
    }[device.type];
    const d = { id: 'd' + Date.now(), on: false, ...defaults, ...device };
    setDevices((list) => [...list, d]);
    log(`Thêm thiết bị ${d.name}`, meta.icon);
    notify('success', 'Thiết bị mới', `${d.name} đã được thêm vào hệ thống.`);
    return true;
  }, [allow, log, notify]);

  /** Sửa thông tin thiết bị: tên, phòng, công suất, chân GPIO */
  const editDevice = useCallback((id, patch) => {
    if (!allow('device.manage')) return false;
    setDevices((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    log(`Sửa thông tin thiết bị ${patch.name || ''}`.trim(), 'pencil-outline');
    return true;
  }, [allow, log]);

  const removeDevice = useCallback((id) => {
    if (!allow('device.manage')) return false;
    const d = devicesRef.current.find((x) => x.id === id);
    setDevices((list) => list.filter((x) => x.id !== id));
    setSchedules((list) => list.filter((s) => s.deviceId !== id));
    if (d) log(`Xóa thiết bị ${d.name}`, 'delete-outline');
    return true;
  }, [allow, log]);

  // ---- Phòng ----
  const addRoom = useCallback((room) => {
    if (!allow('room.manage')) return false;
    setRooms((r) => [...r, { id: 'r' + Date.now(), icon: 'door', area: 20, restricted: false, ...room }]);
    log(`Thêm phòng ${room.name}`, 'door');
    return true;
  }, [allow, log]);

  const editRoom = useCallback((id, patch) => {
    if (!allow('room.manage')) return false;
    setRooms((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    log(`Sửa phòng ${patch.name || ''}`.trim(), 'pencil-outline');
    return true;
  }, [allow, log]);

  /** Xóa phòng: thiết bị trong phòng chuyển sang phòng moveTo; lịch họp sắp tới của phòng bị hủy */
  const removeRoom = useCallback((id, moveTo) => {
    if (!allow('room.manage')) return false;
    const room = roomsRef.current.find((r) => r.id === id);
    if (roomsRef.current.length <= 1) { showMessage('Không thể xóa', 'Hệ thống phải còn ít nhất một phòng.'); return false; }
    setDevices((list) => list.map((d) => (d.roomId === id ? { ...d, roomId: moveTo } : d)));
    setRooms((list) => list.filter((r) => r.id !== id));
    setBookings((list) => list.filter((b) => !(b.roomId === id && b.date >= dateKey())));
    setAutomations((list) => list.map((a) => (a.act?.roomId === id ? { ...a, act: { ...a.act, roomId: undefined } } : a)));
    log(`Xóa phòng ${room?.name}`, 'delete-outline');
    return true;
  }, [allow, log]);

  // ---- Ngữ cảnh (scene) ----
  const doRunScene = useCallback((scene, unlockIds = []) => {
    scene.actions.forEach(({ type, ...patch }) => {
      devicesRef.current.filter((d) => d.type === type).forEach((d) => {
        if (type === 'door' && patch.locked === false) {
          if (unlockIds.includes(d.id)) applyPatch(d.id, patch);
        } else applyPatch(d.id, patch);
      });
    });
    log(`Kích hoạt ngữ cảnh "${scene.name}"`, scene.icon);
    notify('info', 'Ngữ cảnh', `Đã kích hoạt "${scene.name}".`);
  }, [applyPatch, log, notify]);

  const runScene = useCallback((scene) => {
    if (!allow('scene.run')) return;
    const unlocks = scene.actions.some((a) => a.type === 'door' && a.locked === false);
    if (!unlocks) { doRunScene(scene); return; }
    // Ngữ cảnh có mở cửa: phải nhập PIN; cửa không đủ quyền thì bỏ qua
    const doorIds = devicesRef.current.filter((d) => d.type === 'door').map((d) => d.id);
    const { ok } = permittedDoors(doorIds);
    requestPin(`Chạy "${scene.name}"`, `Ngữ cảnh này mở khóa ${ok.length} cửa`, () => doRunScene(scene, ok));
  }, [allow, doRunScene, permittedDoors, requestPin]);

  const addScene = useCallback((scene) => {
    if (!allow('automation.manage')) return false;
    setScenes((s) => [...s, { id: 's' + Date.now(), ...scene }]);
    return true;
  }, [allow]);
  const removeScene = useCallback((id) => allow('automation.manage') && setScenes((s) => s.filter((x) => x.id !== id)), [allow]);

  // ---- Quy tắc tự động & hẹn giờ ----
  const toggleAutomation = useCallback((id) => allow('automation.manage') && setAutomations((a) => a.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x))), [allow]);
  const addAutomation = useCallback((a) => {
    if (!allow('automation.manage')) return false;
    setAutomations((list) => [...list, { id: 'a' + Date.now(), enabled: true, ...a }]);
    log(`Tạo quy tắc "${a.name}"`, 'robot-outline');
    return true;
  }, [allow, log]);
  const removeAutomation = useCallback((id) => allow('automation.manage') && setAutomations((a) => a.filter((x) => x.id !== id)), [allow]);
  const toggleSchedule = useCallback((id) => allow('automation.manage') && setSchedules((s) => s.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x))), [allow]);
  const addSchedule = useCallback((s) => {
    if (!allow('automation.manage')) return false;
    setSchedules((list) => [...list, { id: 'sc' + Date.now(), enabled: true, ...s }]);
    return true;
  }, [allow]);
  const removeSchedule = useCallback((id) => allow('automation.manage') && setSchedules((s) => s.filter((x) => x.id !== id)), [allow]);

  /** Thực thi hành động của một quy tắc */
  const lastFire = useRef({});
  const fireRule = useCallback((rule) => {
    const t = Date.now();
    if (t - (lastFire.current[rule.id] || 0) < RULE_COOLDOWN_MS) return;
    lastFire.current[rule.id] = t;
    const unit = settingsRef.current.tempUnit;
    const cond = triggerText(rule.cond, unit);
    const markRun = () => setAutomations((list) => list.map((x) => (x.id === rule.id ? { ...x, lastRun: t } : x)));

    if (rule.act.key === 'alarm') {
      soundAlarm(10);
      markRun();
      log(`Quy tắc "${rule.name}": bật còi báo động`, 'alarm-light-outline');
      notify('danger', rule.name, `${cond}. Đã bật còi báo động, hãy kiểm tra ngay!`);
      return;
    }
    const def = ACTIONS[rule.act.key];
    if (!def) return;
    const targets = devicesRef.current.filter((d) => d.type === def.type && (!rule.act.roomId || d.roomId === rule.act.roomId));
    const changed = targets.filter((d) => Object.entries(def.patch).some(([k, v]) => d[k] !== v));
    if (!changed.length) return; // thiết bị đã ở đúng trạng thái
    changed.forEach((d) => applyPatch(d.id, def.patch));
    markRun();
    const what = `${actionText(rule.act, roomsRef.current)}: ${changed.map((d) => d.name).join(', ')}`;
    log(`Quy tắc "${rule.name}" → ${what}`, 'robot-outline');
    notify(rule.cond.key === 'time' ? 'info' : 'warning', rule.name, `NẾU ${cond} → ${what}.`);
  }, [applyPatch, soundAlarm, log, notify]);

  // ---- RFID: chấm công + mở cửa chính ----
  const relockTimer = useRef(null);
  const unlockMainDoorBriefly = useCallback(() => {
    if (!devicesRef.current.some((d) => d.id === MAIN_DOOR_ID)) return;
    applyPatch(MAIN_DOOR_ID, { locked: false });
    clearTimeout(relockTimer.current);
    relockTimer.current = setTimeout(() => applyPatch(MAIN_DOOR_ID, { locked: true }), RFID_UNLOCK_SEC * 1000);
  }, [applyPatch]);

  /**
   * Xử lý một lần quẹt thẻ.
   * source 'board': mạch ESP32 báo lên (granted = mạch đã tự mở cửa theo danh sách thẻ trong firmware)
   * source 'app'  : mô phỏng trong app
   */
  const handleRfid = useCallback((rawUid, { source = 'app', granted = false } = {}) => {
    const uid = String(rawUid).trim().toUpperCase();
    const u = usersRef.current.find((x) => x.card === uid);
    if (!u) {
      log(`Thẻ lạ ${uid} bị từ chối tại cửa chính`, 'card-remove-outline');
      notify('warning', 'Thẻ không hợp lệ', `Thẻ ${uid} chưa được đăng ký, cửa không mở.`);
      return { ok: false, uid };
    }
    const today = dateKey();
    const t = hhmm();
    const rec = attendanceRef.current.find((r) => r.userId === u.id && r.date === today);
    const kind = rec ? 'Ra' : 'Vào';
    let next;
    if (!rec) {
      const n = new Date();
      const late = n.getHours() > 8 || (n.getHours() === 8 && n.getMinutes() > 5);
      next = [...attendanceRef.current, { id: 'at' + Date.now(), date: today, userId: u.id, checkIn: t, checkOut: null, status: late ? 'late' : 'ontime' }];
    } else {
      next = attendanceRef.current.map((r) => (r === rec ? { ...r, checkOut: t } : r));
    }
    attendanceRef.current = next;
    setAttendance(next);
    // Quyền mở cửa (VD: khách ngoài giờ)
    const room = roomsRef.current.find((r) => r.id === devicesRef.current.find((d) => d.id === MAIN_DOOR_ID)?.roomId);
    const perm = check(u, 'door.unlock', { room });
    // Mạch chỉ tự mở cho thẻ Quản trị viên / Nhân viên. Thẻ khác (VD Khách) do app kiểm tra khung giờ
    // rồi mới gửi lệnh mở xuống mạch. Nếu mạch đã mở mà app không cho phép -> khóa lại ngay.
    let opened = granted;
    if (!granted && perm.ok) { unlockMainDoorBriefly(); opened = true; }
    if (granted && !perm.ok) { clearTimeout(relockTimer.current); applyPatch(MAIN_DOOR_ID, { locked: true }); opened = false; }
    log(`${u.name} quẹt thẻ ${uid} (${kind.toLowerCase()})${opened ? ' · mở cửa chính' : ''}`, 'card-account-details-outline');
    notify(opened ? 'success' : 'warning', `Chấm công: ${kind}`, opened
      ? `${u.name} quẹt thẻ lúc ${t}, cửa chính mở ${RFID_UNLOCK_SEC} giây.`
      : `${u.name} quẹt thẻ lúc ${t} nhưng không được mở cửa: ${perm.reason}`);
    return { ok: true, user: u, time: t, opened, kind, source };
  }, [log, notify, unlockMainDoorBriefly, applyPatch]);

  const setAttendanceRecord = useCallback((userId, patch) => {
    if (!allow('attendance.manage')) return;
    const today = dateKey();
    setAttendance((list) => (list.some((r) => r.userId === userId && r.date === today)
      ? list.map((r) => (r.userId === userId && r.date === today ? { ...r, ...patch } : r))
      : [...list, { id: 'at' + Date.now(), date: today, userId, checkIn: null, checkOut: null, status: 'ontime', ...patch }]));
  }, [allow]);

  // ---- Đặt phòng họp ----
  const addBooking = useCallback((b) => {
    if (!allow('meeting.book')) return false;
    setBookings((list) => [...list, { id: 'b' + Date.now(), host: userRef.current?.name, ...b }]);
    const room = roomsRef.current.find((r) => r.id === b.roomId);
    log(`Đặt ${room?.name} ngày ${b.date} lúc ${b.start}`, 'calendar-check');
    return true;
  }, [allow, log]);

  const removeBooking = useCallback((id) => {
    const b = bookingsRef.current.find((x) => x.id === id);
    const u = userRef.current;
    if (b && b.host !== u?.name && !check(u, 'system.manage').ok) {
      deny('Chỉ người đặt hoặc Quản trị viên được hủy lịch họp này.');
      return false;
    }
    setBookings((list) => list.filter((x) => x.id !== id));
    if (b) log(`Hủy lịch họp "${b.title}"`, 'calendar-remove');
    return true;
  }, [deny, log]);

  // ---- Thông báo ----
  const markAllRead = useCallback(() => setNotifications((n) => n.map((x) => ({ ...x, read: true }))), []);
  const markRead = useCallback((id) => setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x))), []);
  const clearNotifications = useCallback(() => setNotifications([]), []);
  const dismissToast = useCallback(() => setToast(null), []);

  // ---- Cài đặt ----
  const updateSettings = useCallback((patch) => {
    if (Object.keys(patch).some((k) => SYSTEM_KEYS.includes(k)) && !allow('system.manage')) return false;
    setSettings((s) => ({ ...s, ...patch }));
    return true;
  }, [allow]);

  const resetData = useCallback(() => {
    if (!allow('system.manage')) return;
    setRooms(ROOMS); setDevices(DEVICES); setScenes(SCENES); setAutomations(AUTOMATIONS);
    setSchedules(SCHEDULES); setNotifications(makeNotifications()); setHistory([]); setSettings(DEFAULT_SETTINGS);
    setBookings(makeBookings()); setAttendance(makeAttendance());
  }, [allow]);

  /**
   * Nhận gói cảm biến từ mạch (HTTP hoặc MQTT). Trường fridgeOpen là trạng thái reed switch cửa tủ đông,
   * gửi kèm mỗi lần đọc cảm biến để app luôn đồng bộ (kể cả khi cửa mở sẵn trước lúc mở app).
   */
  const ingestSensors = useCallback((data) => {
    const { fridgeOpen, ...values } = data || {};
    pushSensors((prev) => ({ ...prev, ...values }));
    if (typeof fridgeOpen === 'boolean') {
      const d = devicesRef.current.find((x) => x.id === FREEZER_ID);
      if (d && d.doorOpen !== fridgeOpen) {
        applyPatch(FREEZER_ID, { doorOpen: fridgeOpen }, `Cửa ${d.name} ${fridgeOpen ? 'mở' : 'đóng'} (cảm biến)`, { fromBoard: true });
      }
    }
  }, [pushSensors, applyPatch]);

  // Các hàm mới nhất cho bộ hẹn giờ / MQTT (tránh phải khởi động lại interval mỗi lần render)
  const fn = useRef({});
  useEffect(() => {
    fn.current = { applyPatch, notify, log, fireRule, handleRfid, soundAlarm, ingestSensors };
  });

  // ---- Cảm biến: đọc từ ESP32 (HTTP) hoặc mô phỏng mỗi 5 giây ----
  const eventSeq = useRef(0);
  const syncRef = useRef(null);
  useEffect(() => {
    if (!settings.autoRefresh) return undefined;
    const tick = async () => {
      const st = settingsRef.current;
      if (st.mockMode) {
        pushSensors(simulateSensors);
        setConnected(true);
      } else if (st.transport === 'http') {
        try {
          const next = await fetchSensors(st.serverUrl);
          fn.current.ingestSensors(next);
          setConnected(true);
          // Sự kiện quẹt thẻ RFID phát sinh trên mạch
          const ev = await fetchEvents(st.serverUrl, eventSeq.current);
          const events = ev.events || [];
          events.forEach((e) => {
            if (e.type === 'rfid') fn.current.handleRfid(e.uid, { source: 'board', granted: !!e.granted });
          });
          if (typeof ev.last === 'number') eventSeq.current = ev.last;
          if (events.length) syncRef.current?.(); // mạch vừa tự mở cửa -> đọc lại trạng thái
        } catch {
          setConnected(false);
        }
      }
    };
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [settings.autoRefresh, settings.mockMode, pushSensors]);

  // ---- HTTP LAN: vừa kết nối thì đọc trạng thái thật từ ESP32 về app ----
  const syncFromBoard = useCallback(async () => {
    const st = settingsRef.current;
    if (st.mockMode || st.transport !== 'http') return false;
    try {
      const s = await fetchStatus(st.serverUrl);
      (s.devices || []).forEach(({ id, ...state }) => {
        if (devicesRef.current.some((d) => d.id === id)) fn.current.applyPatch(id, pickSync(state), null, { fromBoard: true });
      });
      // Bỏ qua các sự kiện cũ phát sinh trước khi app kết nối
      if (typeof s.lastEvent === 'number' && eventSeq.current === 0) eventSeq.current = s.lastEvent;
      setBoardInfo(s.name || 'ESP32');
      setConnected(true);
      return true;
    } catch {
      setConnected(false);
      return false;
    }
  }, []);

  useEffect(() => { syncRef.current = syncFromBoard; }, [syncFromBoard]);

  // Mỗi lần đổi chế độ / địa chỉ: chỉ Mô phỏng mới coi là "đã kết nối" ngay.
  // HTTP / MQTT phải bắt đầu từ "chưa kết nối" và chỉ chuyển xanh khi mạch thật sự trả lời,
  // tránh chấm xanh ảo kế thừa từ chế độ Mô phỏng (vd. Wi-Fi chặn cổng 8884).
  const linkKey = settings.mockMode
    ? 'mock'
    : settings.transport === 'mqtt'
      ? `mqtt|${settings.mqttUrl}|${settings.mqttTopic}`
      : `http|${settings.serverUrl}`;
  const [prevLinkKey, setPrevLinkKey] = useState(linkKey);
  if (prevLinkKey !== linkKey) {
    // Điều chỉnh state ngay trong lúc render (React khuyến nghị thay cho setState trong effect)
    setPrevLinkKey(linkKey);
    setConnected(linkKey === 'mock');
  }

  useEffect(() => {
    if (!loaded || settings.mockMode || settings.transport !== 'http') return;
    eventSeq.current = 0;
    syncFromBoard();
  }, [loaded, settings.mockMode, settings.transport, settings.serverUrl, syncFromBoard]);

  // ---- MQTT: nhận cảm biến/trạng thái/RFID từ ESP32 (Wokwi) và gửi lệnh điều khiển ----
  useEffect(() => {
    if (!loaded || settings.mockMode || settings.transport !== 'mqtt') return undefined;
    const base = settings.mqttTopic.replace(/\/$/, '');

    // "Đã kết nối" = broker đã CONNACK VÀ mạch ESP32 đang online (status/sensors).
    // Chỉ mở được WebSocket hay chỉ nối được broker mà mạch tắt thì vẫn là chưa kết nối.
    let disposed = false;
    let brokerUp = false;
    let boardOnline = false;
    let lastBoardMsg = 0;
    const BOARD_TIMEOUT = 20000; // mạch gửi cảm biến mỗi ~2s; 20s im lặng = coi như mất mạch
    const refresh = () => { if (!disposed) setConnected(brokerUp && boardOnline); };
    const markBoardAlive = () => {
      lastBoardMsg = Date.now();
      if (!boardOnline) { boardOnline = true; refresh(); }
    };
    // LWT "offline" của broker có thể tới rất trễ (keep-alive 300s) -> tự phát hiện mạch im lặng
    const watchdog = setInterval(() => {
      if (boardOnline && Date.now() - lastBoardMsg > BOARD_TIMEOUT) { boardOnline = false; refresh(); }
    }, 5000);

    // Gửi toàn bộ trạng thái thiết bị xuống mạch, GIÃN CÁCH từng gói để không tràn bộ đệm ESP32.
    // - Debounce: nhiều lần yêu cầu sát nhau (CONNACK + status retained + mạch khởi động lại) gộp thành 1 lần.
    // - Mỗi gói đọc trạng thái MỚI NHẤT lúc gửi, nên lệnh người dùng bấm giữa chừng không bị ghi đè bởi dữ liệu cũ.
    const SYNC_DEBOUNCE = 400;
    const SYNC_GAP = 80;
    let syncDebounce = null;
    let syncTimer = null;
    const stopSync = () => {
      clearTimeout(syncDebounce);
      clearTimeout(syncTimer);
      syncDebounce = null;
      syncTimer = null;
    };
    const runSync = () => {
      const ids = devicesRef.current.map((d) => d.id);
      let i = 0;
      const step = () => {
        syncTimer = null;
        if (disposed || !client.connected) return;
        while (i < ids.length) {
          const d = devicesRef.current.find((x) => x.id === ids[i++]);
          const body = d ? pickSync(d) : {};
          if (Object.keys(body).length) {
            client.publish(`${base}/cmd/${d.id}`, JSON.stringify(body));
            break;
          }
        }
        if (i < ids.length) syncTimer = setTimeout(step, SYNC_GAP);
      };
      step();
    };
    const scheduleSync = () => {
      stopSync();
      syncDebounce = setTimeout(() => { syncDebounce = null; runSync(); }, SYNC_DEBOUNCE);
    };

    const client = createMqttClient({
      url: settings.mqttUrl,
      clientId: `so-app-${Math.random().toString(16).slice(2, 10)}`,
      onConnect: () => {
        brokerUp = true;
        boardOnline = false; // chờ status/sensors của mạch xác nhận
        refresh();
        client.subscribe(`${base}/sensors`);
        client.subscribe(`${base}/status`);
        client.subscribe(`${base}/state/#`);
        client.subscribe(`${base}/rfid`);
        // Không sync ở đây: status "online" (retain) sẽ tới ngay sau subscribe nếu mạch đang chạy
        // và kích hoạt sync. Mạch offline thì gửi lệnh cũng mất (không retain) -> không cần gửi.
      },
      onMessage: (topic, msg) => {
        if (topic === `${base}/status`) {
          if (msg.startsWith('online')) {
            setBoardInfo(msg.slice(7) || 'ESP32');
            markBoardAlive();
            scheduleSync(); // mạch vừa (khởi động lại và) online -> gửi lại trạng thái hiện tại
          } else {
            boardOnline = false;
            stopSync();
            refresh();
          }
          return;
        }
        let data;
        try { data = JSON.parse(msg); } catch { return; }
        markBoardAlive();
        if (topic === `${base}/sensors`) {
          fn.current.ingestSensors(data);
        } else if (topic.startsWith(`${base}/state/`)) {
          // Trạng thái do mạch tự thay đổi (quẹt thẻ mở cửa, công tắc cửa tủ đông...)
          const id = topic.slice(base.length + 7);
          const d = devicesRef.current.find((x) => x.id === id);
          if (!d) return;
          let text = null;
          if ('locked' in data && data.locked !== d.locked) text = `${d.name} ${data.locked ? 'đã khóa lại' : 'được mở'} (từ mạch)`;
          if ('doorOpen' in data && data.doorOpen !== d.doorOpen) text = `Cửa ${d.name} ${data.doorOpen ? 'mở' : 'đóng'} (cảm biến)`;
          fn.current.applyPatch(id, pickSync(data), text, { fromBoard: true });
        } else if (topic === `${base}/rfid`) {
          fn.current.handleRfid(data.uid, { source: 'board', granted: !!data.granted });
        }
      },
      onClose: () => {
        brokerUp = false;
        boardOnline = false;
        stopSync();
        refresh();
      },
    });
    mqttRef.current = client;
    return () => {
      disposed = true;
      stopSync();
      clearInterval(watchdog);
      client.end();
      mqttRef.current = null;
    };
  }, [loaded, settings.mockMode, settings.transport, settings.mqttUrl, settings.mqttTopic, pushSensors]);

  // ---- Quy tắc theo cảm biến: chạy khi điều kiện chuyển từ SAI sang ĐÚNG ----
  const ruleState = useRef({});
  const motionAlertAt = useRef(0);
  const prevMotion = useRef(false);
  useEffect(() => {
    if (!loaded) return;
    automationsRef.current.forEach((a) => {
      if (!a.enabled || !a.cond || a.cond.key === 'time') return;
      const match = sensorMatches(a.cond, sensors);
      const before = ruleState.current[a.id];
      ruleState.current[a.id] = match;
      if (match && !before) fn.current.fireRule(a);
    });

    // Camera: có chuyển động ngoài giờ làm việc -> cảnh báo + tự ghi hình
    const rising = sensors.motion && !prevMotion.current;
    prevMotion.current = !!sensors.motion;
    const h = new Date().getHours();
    if (rising && (h < WORK_HOURS.from || h >= WORK_HOURS.to) && Date.now() - motionAlertAt.current > 5 * 60000) {
      const cams = devicesRef.current.filter((d) => d.type === 'camera' && d.on && d.motionAlert);
      if (cams.length) {
        motionAlertAt.current = Date.now();
        cams.forEach((c) => !c.recording && fn.current.applyPatch(c.id, { recording: true }));
        fn.current.notify('danger', 'Phát hiện chuyển động', `Có người trong văn phòng lúc ${hhmm()} (ngoài giờ làm việc). Camera ${cams.map((c) => c.name).join(', ')} đã bắt đầu ghi hình.`);
        fn.current.log('Phát hiện chuyển động ngoài giờ, bật ghi hình', 'cctv');
      }
    }
  }, [loaded, sensors]);

  // ---- Bộ đếm thời gian: hẹn giờ, quy tắc theo giờ, hẹn tắt quạt, cửa tủ đông, phòng họp ----
  const fired = useRef(new Set());
  useEffect(() => {
    if (!loaded) return undefined;
    const tick = () => {
      const now = new Date();
      const t = hhmm(now);
      const dk = dateKey(now);
      const nowMin = toMin(t);
      const ms = now.getTime();
      const once = (key) => {
        if (fired.current.has(key)) return false;
        fired.current.add(key);
        if (fired.current.size > 500) fired.current = new Set([...fired.current].slice(-200));
        return true;
      };
      const { applyPatch: apply, notify: say, fireRule: fire } = fn.current;

      // 1. Lịch hẹn giờ bật/tắt
      schedulesRef.current.forEach((s) => {
        const runKey = `${dk} ${t}`;
        if (!s.enabled || s.time !== t || !s.days.includes(now.getDay()) || s.lastRun === runKey || !once(`sc:${s.id}:${runKey}`)) return;
        // Lưu lại lần chạy để tải lại app trong cùng phút không chạy lặp
        setSchedules((list) => list.map((x) => (x.id === s.id ? { ...x, lastRun: runKey } : x)));
        const d = devicesRef.current.find((x) => x.id === s.deviceId);
        if (!d) return;
        const on = s.action === 'on';
        apply(d.id, { on }, `Hẹn giờ: ${on ? 'bật' : 'tắt'} ${d.name}`);
        say('info', 'Hẹn giờ', `${on ? 'Đã bật' : 'Đã tắt'} ${d.name} lúc ${t}.`);
      });

      // 2. Quy tắc theo giờ trong ngày
      automationsRef.current.forEach((a) => {
        const runKey = `${dk} ${t}`;
        if (!a.enabled || a.cond?.key !== 'time' || a.cond.value !== t || a.lastKey === runKey || !once(`rule:${a.id}:${runKey}`)) return;
        setAutomations((list) => list.map((x) => (x.id === a.id ? { ...x, lastKey: runKey } : x)));
        fire(a);
      });

      // 3. Hẹn giờ tắt quạt
      devicesRef.current.forEach((d) => {
        if (d.timerEnd && ms >= d.timerEnd) {
          if (d.on) {
            apply(d.id, { on: false }, `Hết giờ hẹn: tắt ${d.name}`);
            say('info', 'Hẹn giờ tắt', `${d.name} đã tự tắt sau ${d.timer} phút.`);
          } else apply(d.id, { timer: 0, timerEnd: null });
        }
      });

      // 4. Cửa tủ đông mở quá lâu
      devicesRef.current.forEach((d) => {
        if (d.type !== 'freezer' || !d.doorOpen || !d.doorOpenAt) return;
        // doorAlertedAt lưu trong thiết bị -> tải lại app không cảnh báo lặp cho cùng một lần mở cửa
        if (ms - d.doorOpenAt >= FREEZER_DOOR_LIMIT_SEC * 1000 && d.doorAlertedAt !== d.doorOpenAt) {
          apply(d.id, { doorAlertedAt: d.doorOpenAt }, null, { fromBoard: true });
          fn.current.soundAlarm(3);
          say('danger', 'Cửa tủ đông chưa đóng', `${d.name} đã mở quá ${FREEZER_DOOR_LIMIT_SEC} giây, thực phẩm có thể bị rã đông.`);
          fn.current.log(`Cảnh báo: cửa ${d.name} mở quá lâu`, 'fridge-alert-outline');
        }
      });

      // 5. Phòng họp: bật đèn + điều hòa trước giờ họp, tắt khi kết thúc
      bookingsRef.current.forEach((b) => {
        if (b.date !== dk) return;
        const s = toMin(b.start);
        const e = toMin(b.end);
        const room = roomsRef.current.find((r) => r.id === b.roomId);
        const roomDevs = devicesRef.current.filter((d) => d.roomId === b.roomId && (d.type === 'light' || d.type === 'ac'));
        if (!b.prepared && nowMin >= s - MEETING_PREP_MIN && nowMin < e) {
          roomDevs.forEach((d) => !d.on && apply(d.id, { on: true }));
          setBookings((list) => list.map((x) => (x.id === b.id ? { ...x, prepared: true } : x)));
          bookingsRef.current = bookingsRef.current.map((x) => (x.id === b.id ? { ...x, prepared: true } : x));
          say('info', 'Chuẩn bị phòng họp', `"${b.title}" lúc ${b.start}: đã bật ${roomDevs.length} thiết bị (đèn, điều hòa) ở ${room?.name || 'phòng họp'}.`);
          fn.current.log(`Chuẩn bị ${room?.name} cho "${b.title}"`, 'calendar-clock');
        } else if (b.prepared && !b.finished && nowMin >= e) {
          // Chỉ tắt nếu sau đó không còn cuộc họp nào nối tiếp trong phòng
          const next = bookingsRef.current.some((x) => x.id !== b.id && x.roomId === b.roomId && x.date === dk && toMin(x.start) <= e + MEETING_PREP_MIN && toMin(x.end) > e);
          if (!next) roomDevs.forEach((d) => d.on && apply(d.id, { on: false }));
          setBookings((list) => list.map((x) => (x.id === b.id ? { ...x, finished: true } : x)));
          bookingsRef.current = bookingsRef.current.map((x) => (x.id === b.id ? { ...x, finished: true } : x));
          say('info', 'Kết thúc cuộc họp', `"${b.title}" đã kết thúc${next ? '' : `, đã tắt thiết bị ở ${room?.name || 'phòng họp'}`}.`);
        }
      });
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [loaded]);

  const stats = useMemo(() => {
    const powerNow = devices.filter((d) => d.on && d.type !== 'door').reduce((s, d) => s + (d.power || 0), 0);
    return {
      total: devices.length,
      active: devices.filter((d) => d.on && d.type !== 'door').length,
      lockedDoors: devices.filter((d) => d.type === 'door' && d.locked).length,
      powerNow,
      unread: notifications.filter((n) => !n.read).length,
    };
  }, [devices, notifications]);

  const value = {
    loaded, rooms, devices, scenes, automations, schedules, notifications, settings, history, sensors, sensorHistory, connected, stats, boardInfo,
    bookings, attendance, toast, pinRequest,
    can, updateDevice, toggleDevice, setAllOfType, setRoomPower, setFanTimer, triggerAlarm,
    addDevice, editDevice, removeDevice, addRoom, editRoom, removeRoom,
    runScene, addScene, removeScene,
    toggleAutomation, addAutomation, removeAutomation, toggleSchedule, addSchedule, removeSchedule,
    handleRfid, setAttendanceRecord, addBooking, removeBooking,
    requestUnlock, submitPin, cancelPin, pinLockedFor,
    markAllRead, markRead, clearNotifications, dismissToast, updateSettings, resetData, log, syncFromBoard,
    clearHistory: () => allow('system.manage') && setHistory([]),
  };

  return <OfficeContext.Provider value={value}>{children}</OfficeContext.Provider>;
}

export const useOffice = () => useContext(OfficeContext);

/** Hiển thị nhiệt độ theo đơn vị người dùng chọn (dữ liệu luôn lưu °C) */
export function useTemp() {
  const { settings } = useOffice();
  const unit = settings.tempUnit || 'C';
  return {
    unit,
    fmt: (c, withUnit = true) => fmtTemp(c, unit, withUnit),
    val: (c) => tempValue(c, unit),
  };
}
