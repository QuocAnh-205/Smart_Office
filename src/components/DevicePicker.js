// Hook + thanh chọn thiết bị cho các màn hình điều khiển cùng loại (VD: nhiều đèn, nhiều quạt)
import { ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useOffice } from '../context/OfficeContext';
import { Button, Chip, Empty, Screen } from './ui';
import { DEVICE_META } from '../theme';

export function useDeviceOfType(type) {
  const { id } = useLocalSearchParams();
  const { devices } = useOffice();
  const list = devices.filter((d) => d.type === type);
  const [picked, setSelectedId] = useState(null);
  const selectedId = picked ?? id;
  const device = list.find((d) => d.id === selectedId) || list[0];
  return { list, device, setSelectedId };
}

export function DeviceChips({ list, device, onSelect, color }) {
  if (list.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, flexGrow: 0 }}>
      {list.map((d) => (
        <Chip key={d.id} label={d.name} active={d.id === device?.id} onPress={() => onSelect(d.id)} color={color} />
      ))}
    </ScrollView>
  );
}

export function NoDevice({ type }) {
  const meta = DEVICE_META[type];
  return (
    <Screen title={meta.label}>
      <Empty icon={meta.icon} text={`Chưa có thiết bị "${meta.label}" nào. Hãy thêm thiết bị mới.`} />
      <Button title="Thêm thiết bị" icon="plus" onPress={() => router.push('/add-device')} />
    </Screen>
  );
}
