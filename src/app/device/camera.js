// Camera giám sát (ESP32-CAM): xem trực tiếp, ghi hình, chụp ảnh, báo động
// Luồng hình: nhập URL của ESP32-CAM (firmware mẫu CameraWebServer):
//   http://<ip>/capture  -> app tải ảnh JPEG mới mỗi giây (chạy trên Android, iOS, web)
//   http://<ip>:81/stream -> luồng MJPEG, chỉ trình duyệt web hiển thị trực tiếp được
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { DeviceChips, NoDevice, useDeviceOfType } from '../../components/DevicePicker';
import { Button, Card, Icon, Input, ListItem, Screen, SectionTitle, SwitchRow } from '../../components/ui';
import { useOffice } from '../../context/OfficeContext';
import { colors } from '../../theme';

const COLOR = '#EC4899';

export default function CameraScreen() {
  const { list, device, setSelectedId } = useDeviceOfType('camera');
  const { updateDevice, toggleDevice, log, triggerAlarm, can } = useOffice();
  const [clock, setClock] = useState(new Date());
  const [snaps, setSnaps] = useState([]);
  const [draft, setDraft] = useState(null);       // { id, text } URL đang gõ cho camera nào
  const [errUri, setErrUri] = useState(null);     // URL bị lỗi tải hình

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!device) return <NoDevice type="camera" />;

  const url = draft?.id === device.id ? draft.text : device.streamUrl || '';
  const setUrl = (text) => setDraft({ id: device.id, text });
  const stream = device.streamUrl?.trim();
  const imgError = !!stream && errUri === stream;
  const setImgError = (v) => setErrUri(v ? stream : null);
  const isMjpeg = /\/stream/.test(stream || '');
  // Ảnh tĩnh: thêm tham số thời gian để không bị cache, tải lại mỗi giây
  const liveUri = stream ? (isMjpeg ? stream : `${stream}${stream.includes('?') ? '&' : '?'}t=${Math.floor(clock.getTime() / 1000)}`) : null;
  const canShowLive = liveUri && !imgError && (!isMjpeg || Platform.OS === 'web');

  const snap = () => {
    const time = clock.toLocaleTimeString('vi-VN');
    setSnaps((s) => [{ id: String(Date.now()), time, cam: device.name, uri: canShowLive && !isMjpeg ? liveUri : null }, ...s].slice(0, 6));
    log(`Chụp ảnh từ ${device.name}`, 'camera');
  };

  const saveUrl = () => {
    setImgError(false);
    updateDevice(device.id, { streamUrl: url.trim() }, `Cập nhật luồng camera ${device.name}`);
  };

  return (
    <Screen title="Camera giám sát" subtitle={`${list.filter((c) => c.on).length}/${list.length} camera trực tuyến`}>
      <DeviceChips list={list} device={device} onSelect={setSelectedId} color={COLOR} />

      <View style={[styles.view, device.night && { backgroundColor: '#052e16' }]}>
        {device.on ? (
          <>
            {canShowLive ? (
              <Image source={{ uri: liveUri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setImgError(true)} fadeDuration={0} />
            ) : (
              <>
                <Icon name="cctv" size={70} color={device.night ? '#4ADE80' : '#475569'} />
                <Text style={styles.placeholder}>
                  {imgError ? 'Không tải được hình từ ESP32-CAM, kiểm tra URL / mạng' : stream && isMjpeg ? 'Luồng MJPEG chỉ xem được trên web. Dùng URL /capture cho điện thoại.' : 'Chưa cấu hình URL ESP32-CAM (xem bên dưới)'}
                </Text>
              </>
            )}
            <View style={styles.liveTag}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
            {device.recording ? <View style={styles.recTag}><Text style={styles.liveText}>● REC</Text></View> : null}
            <Text style={styles.ts}>{device.name} · {clock.toLocaleString('vi-VN')}</Text>
          </>
        ) : (
          <>
            <Icon name="video-off-outline" size={60} color="#64748B" />
            <Text style={{ color: '#94A3B8', marginTop: 8 }}>Camera đang tắt</Text>
          </>
        )}
      </View>

      <View style={styles.actions}>
        <Action icon="power" label={device.on ? 'Tắt' : 'Bật'} active={device.on} onPress={() => toggleDevice(device.id)} />
        <Action icon="record-rec" label="Ghi hình" active={device.recording} disabled={!device.on}
          onPress={() => updateDevice(device.id, { recording: !device.recording }, `${device.recording ? 'Dừng' : 'Bắt đầu'} ghi hình ${device.name}`)} />
        <Action icon="camera-outline" label="Chụp ảnh" disabled={!device.on} onPress={snap} />
        <Action icon="alarm-light-outline" label="Báo động" onPress={() => triggerAlarm(device.name)} />
      </View>

      <SectionTitle title="Cài đặt camera" />
      <Card style={{ paddingVertical: 0 }}>
        <SwitchRow icon="motion-sensor" iconColor={COLOR} title="Cảnh báo chuyển động ngoài giờ" subtitle="PIR phát hiện người trước 7:00 / sau 18:00 → thông báo + tự ghi hình"
          value={!!device.motionAlert} onValueChange={(v) => updateDevice(device.id, { motionAlert: v }, `${v ? 'Bật' : 'Tắt'} cảnh báo chuyển động ${device.name}`)} />
        <SwitchRow icon="weather-night" iconColor={colors.purple} title="Chế độ ban đêm" subtitle="Bật đèn hồng ngoại" value={!!device.night}
          onValueChange={(v) => updateDevice(device.id, { night: v })} last />
      </Card>

      <SectionTitle title="Luồng hình ESP32-CAM" />
      <Card>
        <Input icon="link-variant" placeholder="http://192.168.1.50/capture" value={url} onChangeText={setUrl} keyboardType="url" editable={can('device.manage')} />
        {can('device.manage') ? <Button title="Lưu URL" icon="content-save-outline" variant="outline" onPress={saveUrl} /> : null}
        <Text style={styles.hint}>/capture: ảnh JPEG làm mới mỗi giây (điện thoại + web). :81/stream: MJPEG (chỉ web). Điện thoại phải cùng mạng với ESP32-CAM.</Text>
      </Card>

      <SectionTitle title="Ảnh chụp gần đây" />
      <Card style={{ paddingVertical: 0 }}>
        {snaps.length ? snaps.map((s, i) => (
          <ListItem key={s.id} icon="image-outline" iconColor={COLOR} title={`Ảnh lúc ${s.time}`} subtitle={s.cam} last={i === snaps.length - 1}
            right={s.uri ? <Image source={{ uri: s.uri }} style={styles.thumb} /> : undefined} />
        )) : <Text style={{ color: colors.muted, padding: 16, textAlign: 'center' }}>Chưa có ảnh nào</Text>}
      </Card>
    </Screen>
  );
}

function Action({ icon, label, onPress, active, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.action, { opacity: disabled ? 0.4 : 1 }]}>
      <View style={[styles.actionIcon, active && { backgroundColor: COLOR }]}>
        <Icon name={icon} size={24} color={active ? '#fff' : COLOR} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  view: { height: 220, borderRadius: 20, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  liveTag: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.danger, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  recTag: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', marginRight: 4 },
  liveText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  placeholder: { color: '#94A3B8', marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 10, lineHeight: 17 },
  thumb: { width: 56, height: 40, borderRadius: 6, backgroundColor: colors.bg },
  ts: { position: 'absolute', bottom: 10, left: 12, color: '#E2E8F0', fontSize: 11 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  action: { alignItems: 'center', flex: 1 },
  actionIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: COLOR + '1A', alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, color: colors.text, marginTop: 6, fontWeight: '500' },
});
