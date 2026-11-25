export const colors = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#EEF2FF',
  bg: '#F5F7FC',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E8ECF4',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  purple: '#8B5CF6',
  pink: '#EC4899',
  white: '#FFFFFF',
};

export const gradients = {
  primary: ['#6366F1', '#8B5CF6'],
  dark: ['#1E1B4B', '#312E81'],
  light: ['#FBBF24', '#F59E0B'],
  fan: ['#22D3EE', '#0891B2'],
  ac: ['#60A5FA', '#2563EB'],
  freezer: ['#67E8F9', '#0E7490'],
  door: ['#34D399', '#059669'],
  curtain: ['#C084FC', '#7C3AED'],
  camera: ['#F472B6', '#DB2777'],
  danger: ['#F87171', '#DC2626'],
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28 };

// boxShadow chạy được trên cả Android, iOS (New Architecture) và web
export const shadow = {
  boxShadow: '0px 8px 24px rgba(15, 23, 42, 0.06)',
};

export const shadowStrong = {
  boxShadow: '0px 12px 32px rgba(79, 70, 229, 0.28)',
};

// Thông tin hiển thị cho từng loại thiết bị
export const DEVICE_META = {
  light: { label: 'Đèn', icon: 'lightbulb-on-outline', color: '#F59E0B', route: '/device/light', gradient: gradients.light },
  fan: { label: 'Quạt', icon: 'fan', color: '#06B6D4', route: '/device/fan', gradient: gradients.fan },
  ac: { label: 'Điều hòa', icon: 'air-conditioner', color: '#3B82F6', route: '/device/ac', gradient: gradients.ac },
  freezer: { label: 'Tủ đông lạnh', icon: 'fridge-outline', color: '#0E7490', route: '/device/freezer', gradient: gradients.freezer },
  door: { label: 'Khóa cửa', icon: 'door-closed-lock', color: '#10B981', route: '/device/door', gradient: gradients.door },
  curtain: { label: 'Rèm cửa', icon: 'curtains', color: '#8B5CF6', route: '/device/curtain', gradient: gradients.curtain },
  camera: { label: 'Camera', icon: 'cctv', color: '#EC4899', route: '/device/camera', gradient: gradients.camera },
};
