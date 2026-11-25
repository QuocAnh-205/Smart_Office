// Cấu hình kết nối tới ESP32: mô phỏng, MQTT (Wokwi / Internet) hoặc HTTP trong mạng LAN
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Icon, Input, Screen, SectionTitle, Segmented } from '../components/ui';
import { useOffice, useTemp } from '../context/OfficeContext';
import { pingServer } from '../services/api';
import { colors } from '../theme';

const MODES = [
  { value: 'mock', label: 'Mô phỏng', icon: 'test-tube' },
  { value: 'mqtt', label: 'MQTT', icon: 'cloud-sync-outline' },
  { value: 'http', label: 'Wi-Fi LAN', icon: 'wifi' },
];

export default function Connection() {
  const { settings, updateSettings, connected, sensors, boardInfo, can, syncFromBoard } = useOffice();
  const { fmt } = useTemp();
  const admin = can('system.manage');
  const mode = settings.mockMode ? 'mock' : settings.transport;
  const [url, setUrl] = useState(settings.serverUrl);
  const [mqttUrl, setMqttUrl] = useState(settings.mqttUrl);
  const [topic, setTopic] = useState(settings.mqttTopic);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const setMode = (m) => {
    setResult(null);
    if (m === 'mock') updateSettings({ mockMode: true });
    else updateSettings({ mockMode: false, transport: m });
  };

  const syncNow = async () => {
    setTesting(true);
    const ok = await syncFromBoard();
    setTesting(false);
    setResult(ok ? { ok: true, text: 'Đã đọc trạng thái thiết bị từ ESP32 về app.' } : { ok: false, text: 'Không đọc được trạng thái, kiểm tra địa chỉ ESP32.' });
  };

  const testHttp = async () => {
    setTesting(true);
    setResult(null);
    try {
      const r = await pingServer(url);
      setResult({ ok: true, text: `Kết nối thành công: ${r.name || 'ESP32'}` });
    } catch (e) {
      setResult({ ok: false, text: `Không kết nối được (${e.name === 'AbortError' ? 'hết thời gian chờ' : e.message})` });
    } finally {
      setTesting(false);
    }
  };

  const statusText = mode === 'mock'
    ? 'Đang chạy chế độ mô phỏng'
    : connected
      ? `Đã kết nối ${mode === 'mqtt' ? `mạch ${boardInfo || 'ESP32'} qua MQTT` : 'ESP32'}`
      : mode === 'mqtt' ? 'Đang chờ mạch ESP32 (Wokwi) online…' : 'Mất kết nối ESP32';
  const dot = mode === 'mock' ? colors.warning : connected ? colors.success : colors.danger;

  return (
    <Screen title="Kết nối thiết bị" subtitle="Chọn cách app giao tiếp với ESP32">
      <Card style={styles.status}>
        <View style={[styles.dotWrap, { backgroundColor: dot + '22' }]}><View style={[styles.dot, { backgroundColor: dot }]} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusText}>{statusText}</Text>
          {mode !== 'mock' && connected ? (
            <Text style={styles.small}>Nhiệt độ {fmt(sensors.temperature)} · Độ ẩm {sensors.humidity}% · Gas {sensors.gas} ppm</Text>
          ) : null}
        </View>
      </Card>

      <SectionTitle title="Chế độ kết nối" />
      {admin ? <Segmented options={MODES} value={mode} onChange={setMode} /> : (
        <Card><Text style={{ color: colors.muted }}>Đang dùng: {MODES.find((m) => m.value === mode)?.label}. Chỉ Quản trị viên được đổi cấu hình kết nối.</Text></Card>
      )}

      {mode === 'mqtt' && admin ? (
        <>
          <SectionTitle title="Cấu hình MQTT" />
          <Input label="Broker (WebSocket)" icon="server-network" value={mqttUrl} onChangeText={setMqttUrl} keyboardType="url" />
          <Input label="Topic gốc (phải trùng với firmware)" icon="pound" value={topic} onChangeText={setTopic} />
          <Button
            title="Lưu & kết nối lại"
            icon="content-save-outline"
            onPress={() => {
              updateSettings({ mqttUrl: mqttUrl.trim(), mqttTopic: topic.trim() });
              setResult({ ok: true, text: 'Đã lưu, đang kết nối lại tới broker…' });
            }}
          />
          <SectionTitle title="Chạy với Wokwi" />
          <Card>
            {[
              'Mở project Wokwi (ESP32) và bấm nút ▶ để chạy mô phỏng.',
              'Đợi màn hình LCD trong Wokwi hiện "MQTT: OK".',
              'Bật/tắt thiết bị trong app: đèn LED, servo cửa/rèm trên Wokwi sẽ đổi theo.',
              'Chỉnh cảm biến trong Wokwi (bấm vào DHT22, biến trở gas…) thì app cập nhật ngay.',
            ].map((t, i) => <Step key={i} n={i + 1} text={t} />)}
          </Card>
        </>
      ) : null}

      {mode === 'http' && admin ? (
        <>
          <SectionTitle title="Địa chỉ ESP32 trong mạng LAN" />
          <Input icon="ip-network-outline" placeholder="http://192.168.1.100" value={url} onChangeText={setUrl} keyboardType="url" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button title="Kiểm tra" variant="outline" icon="lan-pending" style={{ flex: 1 }} onPress={testHttp} loading={testing} />
            <Button title="Lưu" icon="content-save-outline" style={{ flex: 1 }} onPress={() => { updateSettings({ serverUrl: url.trim() }); setResult({ ok: true, text: 'Đã lưu địa chỉ ESP32, đang đồng bộ trạng thái…' }); }} />
          </View>
          <Button title="Đồng bộ trạng thái từ ESP32" variant="outline" icon="sync" style={{ marginTop: 12 }} onPress={syncNow} loading={testing} />
          <Text style={styles.small}>Khi mở app hoặc đổi địa chỉ, app tự gọi GET /api/status để lấy trạng thái bật/tắt thật của mạch.</Text>
          <SectionTitle title="Hướng dẫn" />
          <Card>
            {[
              'Nạp firmware arduino/SmartOffice_ESP32 vào ESP32 thật.',
              'Sửa WIFI_SSID, WIFI_PASS rồi xem IP trên Serial Monitor (115200).',
              'Điện thoại và ESP32 phải cùng mạng Wi-Fi.',
            ].map((t, i) => <Step key={i} n={i + 1} text={t} />)}
          </Card>
        </>
      ) : null}

      {mode === 'mock' ? (
        <Card style={{ marginTop: 16 }}>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>
            Dữ liệu cảm biến được sinh ngẫu nhiên, lệnh điều khiển không gửi đi đâu. Dùng để demo khi không có phần cứng.
          </Text>
        </Card>
      ) : null}

      {result ? (
        <View style={[styles.result, { backgroundColor: (result.ok ? colors.success : colors.danger) + '15' }]}>
          <Icon name={result.ok ? 'check-circle' : 'alert-circle'} size={20} color={result.ok ? colors.success : colors.danger} />
          <Text style={{ flex: 1, marginLeft: 8, color: result.ok ? colors.success : colors.danger }}>{result.text}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

function Step({ n, text }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 10 }}>
      <View style={styles.step}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{n}</Text></View>
      <Text style={{ flex: 1, color: colors.text, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center' },
  dotWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontWeight: '700', color: colors.text },
  small: { color: colors.muted, fontSize: 12, marginTop: 3 },
  result: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 12 },
  step: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
});
