// Bộ component giao diện dùng chung cho toàn bộ ứng dụng
import { useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, gradients, radius, shadow } from '../theme';

export const Icon = MaterialCommunityIcons;

/** Khung màn hình: safe area + cuộn + header tùy chọn */
export function Screen({ children, scroll = true, title, subtitle, back = true, right, edges = ['top'], contentStyle }) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {title ? <Header title={title} subtitle={subtitle} back={back} right={right} /> : null}
      <Body
        style={!scroll && { flex: 1 }}
        contentContainerStyle={scroll ? [styles.content, contentStyle] : undefined}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {scroll ? children : <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>}
      </Body>
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, back = true, right }) {
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable
          style={styles.iconBtn}
          hitSlop={8}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        >
          <Icon name="chevron-left" size={26} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, marginLeft: back ? 8 : 0 }}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function IconButton({ icon, onPress, color = colors.text, bg = colors.card, size = 22, badge }) {
  return (
    <Pressable onPress={onPress} style={[styles.iconBtn, { backgroundColor: bg }]} hitSlop={6}>
      <Icon name={icon} size={size} color={color} />
      {badge ? (
        <View style={styles.badge}><Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text></View>
      ) : null}
    </Pressable>
  );
}

export function Card({ children, style, onPress }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style }) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const content = (
    <View style={styles.btnInner}>
      {loading ? (
        <ActivityIndicator color={isPrimary || isDanger ? '#fff' : colors.primary} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={20} color={isPrimary || isDanger ? '#fff' : colors.primary} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.btnText, { color: isPrimary || isDanger ? '#fff' : colors.primary }]}>{title}</Text>
        </>
      )}
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }, style]}
    >
      {isPrimary || isDanger ? (
        <LinearGradient
          colors={isDanger ? gradients.danger : gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.btn, { boxShadow: isDanger ? '0px 10px 24px rgba(239,68,68,0.28)' : '0px 10px 24px rgba(99,102,241,0.32)' }]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.btn, styles.btnOutline]}>{content}</View>
      )}
    </Pressable>
  );
}

export function Input({ label, icon, secure, error, style, ...props }) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, focused && styles.inputFocus, error && { borderColor: colors.danger }]}>
        {icon ? <Icon name={icon} size={20} color={focused ? colors.primary : colors.muted} style={{ marginRight: 10 }} /> : null}
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.muted}
          secureTextEntry={hidden}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {secure ? (
          <Pressable onPress={() => setHidden(!hidden)} hitSlop={8}>
            <Icon name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function SectionTitle({ title, action, onAction, style }) {
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Nút tròn bật/tắt lớn ở các màn hình điều khiển */
export function PowerButton({ on, onPress, color = colors.primary, size = 72, label }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center' }}>
      <View
        style={[
          styles.power,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: on ? color : colors.card, borderColor: on ? color : colors.border },
          on && { boxShadow: `0px 10px 28px ${color}66` },
        ]}
      >
        <Icon name="power" size={size * 0.45} color={on ? '#fff' : colors.muted} />
      </View>
      {label !== false ? <Text style={[styles.powerLabel, { color: on ? color : colors.muted }]}>{label || (on ? 'Đang bật' : 'Đang tắt')}</Text> : null}
    </Pressable>
  );
}

/** Nhóm nút chọn (segmented control) */
export function Segmented({ options, value, onChange, color = colors.primary }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[styles.segItem, active && { backgroundColor: color }]}>
            {o.icon ? <Icon name={o.icon} size={18} color={active ? '#fff' : colors.muted} /> : null}
            <Text style={[styles.segText, active && { color: '#fff' }]} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress, icon, color = colors.primary }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}>
      {icon ? <Icon name={icon} size={16} color={active ? '#fff' : colors.muted} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function ListItem({ icon, iconColor = colors.primary, title, subtitle, right, onPress, danger, last }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.listItem, !last && styles.listBorder, pressed && { opacity: 0.7 }]}>
      {icon ? (
        <View style={[styles.listIcon, { backgroundColor: (danger ? colors.danger : iconColor) + '18' }]}>
          <Icon name={icon} size={20} color={danger ? colors.danger : iconColor} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.listTitle, danger && { color: colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={styles.listSub}>{subtitle}</Text> : null}
      </View>
      {right !== undefined ? right : onPress ? <Icon name="chevron-right" size={22} color={colors.muted} /> : null}
    </Pressable>
  );
}

export function SwitchRow({ icon, iconColor, title, subtitle, value, onValueChange, last }) {
  return (
    <ListItem
      icon={icon}
      iconColor={iconColor}
      title={title}
      subtitle={subtitle}
      last={last}
      right={<Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" activeThumbColor="#fff" />}
    />
  );
}

export function StatCard({ icon, label, value, unit, color = colors.primary, style }) {
  return (
    <Card style={[styles.stat, style]}>
      <View style={[styles.statIcon, { backgroundColor: color + '1A' }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

export function Empty({ icon = 'inbox-outline', text }) {
  return (
    <View style={{ alignItems: 'center', padding: 40 }}>
      <Icon name={icon} size={56} color={colors.border} />
      <Text style={{ color: colors.muted, marginTop: 10, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

/** Biểu đồ cột đơn giản không cần thư viện ngoài */
export function BarChart({ data, valueKey, labelKey, color = colors.primary, height = 140, unit = '' }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: height + 40 }}>
      {data.map((d, i) => {
        const h = (d[valueKey] / max) * height;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 4 }}>{d[valueKey]}{unit}</Text>
            <View style={{ width: '55%', height: Math.max(h, 4), backgroundColor: color, borderRadius: 6, opacity: 0.35 + 0.65 * (d[valueKey] / max) }} />
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 6 }}>{d[labelKey]}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function ProgressBar({ value, max = 100, color = colors.primary, height = 8 }) {
  return (
    <View style={{ height, borderRadius: height, backgroundColor: colors.border, overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(100, (value / max) * 100)}%`, height, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

export function Avatar({ name = '?', size = 48, color = colors.primary }) {
  const initials = name.split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontWeight: '700', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  headerSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: colors.danger, minWidth: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.card },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: '#EEF1F7', ...shadow },
  btn: { height: 54, borderRadius: radius.md, justifyContent: 'center', paddingHorizontal: 20 },
  btnOutline: { borderWidth: 1.5, borderColor: '#C7D2FE', backgroundColor: colors.primaryLight },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFD', borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, height: 54 },
  inputFocus: { borderColor: colors.primary, backgroundColor: colors.card, boxShadow: '0px 0px 0px 4px rgba(99,102,241,0.12)' },
  input: { flex: 1, fontSize: 15, color: colors.text, height: '100%', outlineStyle: 'none' },
  error: { color: colors.danger, fontSize: 12, marginTop: 6, fontWeight: '500' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  sectionAction: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  power: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  powerLabel: { marginTop: 8, fontWeight: '700', fontSize: 13 },
  segment: { flexDirection: 'row', backgroundColor: '#EEF1F7', borderRadius: radius.md, padding: 4 },
  segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 4 },
  segText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  listBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F4F9' },
  listIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  listTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  listSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  stat: { flex: 1, padding: 14 },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  statUnit: { fontSize: 13, fontWeight: '600', color: colors.muted },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
