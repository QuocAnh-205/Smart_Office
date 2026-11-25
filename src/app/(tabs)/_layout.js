import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Icon } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useOffice } from '../../context/OfficeContext';
import { colors } from '../../theme';

// Icon tab: khi được chọn sẽ nằm trong một "viên thuốc" màu nhạt
const tab = (title, icon, iconActive) => ({
  title,
  tabBarIcon: ({ color, focused }) => (
    <View
      style={{
        width: 48,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? colors.primaryLight : 'transparent',
      }}
    >
      <Icon name={focused ? iconActive : icon} size={22} color={color} />
    </View>
  ),
});

export default function TabsLayout() {
  const { user, ready } = useAuth();
  const { stats } = useOffice();
  if (ready && !user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 14,
          height: 76,
          paddingTop: 8,
          paddingBottom: 14,
          borderRadius: 26,
          borderTopWidth: 0,
          backgroundColor: 'rgba(255,255,255,0.97)',
          boxShadow: '0px 12px 32px rgba(15, 23, 42, 0.12)',
        },
        tabBarItemStyle: { paddingTop: 2 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 4, lineHeight: 16, overflow: 'visible' },
        tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10, fontWeight: '800' },
      }}
    >
      <Tabs.Screen name="index" options={tab('Trang chủ', 'home-variant-outline', 'home-variant')} />
      <Tabs.Screen name="rooms" options={tab('Phòng', 'view-grid-outline', 'view-grid')} />
      <Tabs.Screen name="automation" options={tab('Tự động', 'robot-outline', 'robot')} />
      <Tabs.Screen
        name="notifications"
        options={{ ...tab('Thông báo', 'bell-outline', 'bell'), tabBarBadge: stats.unread || undefined }}
      />
      <Tabs.Screen name="profile" options={tab('Cá nhân', 'account-circle-outline', 'account-circle')} />
    </Tabs>
  );
}
