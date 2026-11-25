// Màn hình giới thiệu (3 trang)
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button, Icon } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

const SLIDES = [
  { icon: 'lightbulb-group-outline', color: colors.warning, title: 'Điều khiển mọi thiết bị', text: 'Bật tắt đèn, quạt, điều hòa, tủ đông lạnh, rèm cửa… chỉ với một chạm, ở bất cứ đâu.' },
  { icon: 'chart-line', color: colors.info, title: 'Giám sát môi trường', text: 'Theo dõi nhiệt độ, độ ẩm, khí gas, ánh sáng theo thời gian thực từ cảm biến Arduino / ESP32.' },
  { icon: 'robot-outline', color: colors.purple, title: 'Tự động hóa thông minh', text: 'Tạo ngữ cảnh, hẹn giờ và quy tắc tự động để văn phòng vận hành tiết kiệm năng lượng.' },
];

export default function Onboarding() {
  // Đo bề rộng thật của khung (trên web app nằm trong khung điện thoại)
  const [width, setWidth] = useState(0);
  const { finishOnboarding } = useAuth();
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  const done = async () => {
    await finishOnboarding();
    router.replace('/login');
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
      setIndex(index + 1);
    } else done();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Pressable onPress={done} style={styles.skip}><Text style={styles.skipText}>Bỏ qua</Text></Pressable>
      <View style={{ flex: 1 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.circle, { backgroundColor: item.color + '1F' }]}>
              <View style={[styles.circleInner, { backgroundColor: item.color + '33' }]}>
                <Icon name={item.icon} size={76} color={item.color} />
              </View>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      /> : null}
      </View>
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <View style={{ padding: 24 }}>
        <Button title={index === SLIDES.length - 1 ? 'Bắt đầu' : 'Tiếp tục'} icon={index === SLIDES.length - 1 ? 'rocket-launch-outline' : 'arrow-right'} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  skip: { alignSelf: 'flex-end', padding: 20 },
  skipText: { color: colors.muted, fontWeight: '600' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  circle: { width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  circleInner: { width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  text: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border, marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: colors.primary },
});
