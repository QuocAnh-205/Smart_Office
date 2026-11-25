// Thông báo / cảnh báo
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Chip, Empty, Icon, IconButton, Screen } from '../../components/ui';
import { useOffice } from '../../context/OfficeContext';
import { colors } from '../../theme';
import { confirmAction } from '../../utils/helpers';
import { relTime } from '../../utils/time';

const TYPE = {
  warning: { icon: 'alert-outline', color: colors.warning, label: 'Cảnh báo' },
  danger: { icon: 'alert-octagon-outline', color: colors.danger, label: 'Nguy hiểm' },
  info: { icon: 'information-outline', color: colors.info, label: 'Thông tin' },
  success: { icon: 'check-circle-outline', color: colors.success, label: 'Thành công' },
};

export default function Notifications() {
  const { notifications, markAllRead, markRead, clearNotifications, stats } = useOffice();
  const [filter, setFilter] = useState('all');
  const list = notifications.filter((n) => (filter === 'all' ? true : filter === 'unread' ? !n.read : n.type === filter));

  return (
    <Screen title="Thông báo" subtitle={`${stats.unread} chưa đọc`} back={false}
      right={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon="check-all" onPress={markAllRead} />
          <IconButton icon="delete-sweep-outline" color={colors.danger} onPress={() => confirmAction('Xóa tất cả thông báo?', clearNotifications)} />
        </View>
      }>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
        <Chip label="Tất cả" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Chưa đọc" active={filter === 'unread'} onPress={() => setFilter('unread')} />
        {Object.entries(TYPE).map(([k, t]) => (
          <Chip key={k} label={t.label} icon={t.icon} color={t.color} active={filter === k} onPress={() => setFilter(k)} />
        ))}
      </View>
      {list.length === 0 ? <Empty icon="bell-sleep-outline" text="Không có thông báo nào" /> : list.map((n) => {
        const t = TYPE[n.type] || TYPE.info;
        return (
          <Pressable key={n.id} onPress={() => markRead(n.id)}>
            <Card style={[styles.item, !n.read && { borderLeftWidth: 4, borderLeftColor: t.color }]}>
              <View style={[styles.icon, { backgroundColor: t.color + '1A' }]}><Icon name={t.icon} size={22} color={t.color} /></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[styles.title, !n.read && { fontWeight: '800' }]}>{n.title}</Text>
                  <Text style={styles.time}>{n.ts ? relTime(n.ts) : n.time}</Text>
                </View>
                <Text style={styles.msg}>{n.message}</Text>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', marginBottom: 10, padding: 14 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  time: { fontSize: 11, color: colors.muted },
  msg: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
});
