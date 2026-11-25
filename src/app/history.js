// Lịch sử hoạt động
import { Text, View } from 'react-native';
import { Card, Empty, Icon, IconButton, Screen } from '../components/ui';
import { useOffice } from '../context/OfficeContext';
import { colors } from '../theme';
import { confirmAction } from '../utils/helpers';

export default function History() {
  const { history, clearHistory } = useOffice();
  return (
    <Screen title="Lịch sử hoạt động" subtitle={`${history.length} sự kiện`}
      right={<IconButton icon="delete-sweep-outline" color={colors.danger} onPress={() => confirmAction('Xóa toàn bộ lịch sử?', clearHistory)} />}>
      {history.length === 0 ? <Empty icon="history" text="Chưa có hoạt động nào. Hãy thử điều khiển một thiết bị!" /> : (
        <Card>
          {history.map((h, i) => (
            <View key={h.id} style={{ flexDirection: 'row' }}>
              <View style={{ alignItems: 'center', marginRight: 12 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={h.icon || 'information-outline'} size={18} color={colors.primary} />
                </View>
                {i < history.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: colors.border, minHeight: 16 }} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: 16 }}>
                <Text style={{ fontWeight: '600', color: colors.text }}>{h.text}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{h.time} · {h.date}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
