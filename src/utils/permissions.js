// Phân quyền theo vai trò (RBAC). Mọi thao tác ghi đều được kiểm tra tại OfficeContext / AuthContext,
// giao diện chỉ ẩn bớt nút cho gọn.

export const ROLES = {
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân viên',
  GUEST: 'Khách',
};

export const ROLE_LIST = [ROLES.ADMIN, ROLES.STAFF, ROLES.GUEST];

export const ROLE_DESC = {
  [ROLES.ADMIN]: 'Toàn quyền: thêm/sửa/xóa phòng, thiết bị, thành viên, quy tắc tự động, cài đặt hệ thống, mở mọi cửa.',
  [ROLES.STAFF]: 'Điều khiển thiết bị, chạy ngữ cảnh, đặt phòng họp, mở cửa khu vực chung.',
  [ROLES.GUEST]: 'Chỉ xem trạng thái; được mở cửa khu vực chung trong giờ hành chính (08:00–18:00).',
};

// Giờ khách được phép mở cửa
export const GUEST_HOURS = { from: 8, to: 18 };

const MATRIX = {
  'device.control': [ROLES.ADMIN, ROLES.STAFF],
  'device.manage': [ROLES.ADMIN],
  'room.manage': [ROLES.ADMIN],
  'scene.run': [ROLES.ADMIN, ROLES.STAFF],
  'automation.manage': [ROLES.ADMIN],
  'member.manage': [ROLES.ADMIN],
  'system.manage': [ROLES.ADMIN],
  'meeting.book': [ROLES.ADMIN, ROLES.STAFF],
  'attendance.manage': [ROLES.ADMIN],
};

const REASON = {
  'device.control': 'Tài khoản Khách chỉ được xem trạng thái thiết bị.',
  'device.manage': 'Chỉ Quản trị viên được thêm, sửa hoặc xóa thiết bị.',
  'room.manage': 'Chỉ Quản trị viên được thêm, sửa hoặc xóa phòng.',
  'scene.run': 'Tài khoản Khách không được chạy ngữ cảnh.',
  'automation.manage': 'Chỉ Quản trị viên được thay đổi quy tắc tự động, hẹn giờ và ngữ cảnh.',
  'member.manage': 'Chỉ Quản trị viên được quản lý thành viên.',
  'system.manage': 'Chỉ Quản trị viên được thay đổi cấu hình hệ thống.',
  'meeting.book': 'Tài khoản Khách không được đặt phòng họp.',
  'attendance.manage': 'Chỉ Quản trị viên được thao tác chấm công thủ công.',
};

/**
 * Kiểm tra quyền.
 * @returns {{ ok: boolean, reason?: string }}
 */
export function check(user, action, ctx = {}) {
  const role = user?.role;
  if (!role) return { ok: false, reason: 'Bạn chưa đăng nhập.' };

  if (action === 'door.unlock') {
    if (role === ROLES.ADMIN) return { ok: true };
    if (ctx.room?.restricted) {
      return { ok: false, reason: `${ctx.room.name} là khu vực hạn chế, chỉ Quản trị viên được mở.` };
    }
    if (role === ROLES.GUEST) {
      const h = (ctx.now || new Date()).getHours();
      if (h < GUEST_HOURS.from || h >= GUEST_HOURS.to) {
        return { ok: false, reason: `Khách chỉ được mở cửa từ ${GUEST_HOURS.from}:00 đến ${GUEST_HOURS.to}:00.` };
      }
    }
    return { ok: true };
  }
  if (action === 'door.lock') return { ok: true }; // khóa cửa luôn an toàn

  const allowed = MATRIX[action];
  if (!allowed) return { ok: true };
  return allowed.includes(role) ? { ok: true } : { ok: false, reason: REASON[action] };
}

export const can = (user, action, ctx) => check(user, action, ctx).ok;
export const isAdmin = (user) => user?.role === ROLES.ADMIN;
