import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Line,
  LinearGradient,
  RadialGradient,
  Stop,
} from "react-native-svg";

import { NAV_COLORS } from "@/constants/theme";

/** Height of the floating pill. */
export const TAB_BAR_HEIGHT = 64;
/** Diameter of the raised log-a-round button. */
const ACTION_SIZE = 64;
/** How far the action button rises above the pill. */
const ACTION_RISE = 22;

/** Gap between the pill and the bottom of the screen. */
function barOffset(bottomInset: number): number {
  // Sit just above the home indicator, or a little off the edge without one.
  return Math.max(bottomInset - 8, 14);
}

/** Space a screen should leave at the bottom so content clears the tab bar. */
export function useTabBarSpace(): number {
  return barOffset(useSafeAreaInsets().bottom) + TAB_BAR_HEIGHT + 8;
}

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: "Home", icon: "home-outline" },
  explore: { label: "Explore", icon: "compass-outline" },
  trophies: { label: "Trophies", icon: "trophy-outline" },
  profile: { label: "Profile", icon: "person-outline" },
};

/**
 * A floating pill with four icon tabs split around a raised, pearlescent
 * button. The button logs a round rather than being a tab of its own —
 * adding rounds is the one thing the app should always make easy.
 */
export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const renderTab = (index: number) => {
    const route = state.routes[index];
    const tab = route && TABS[route.name];
    if (!tab) return null;
    const focused = state.index === index;
    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return (
      <Pressable
        key={route.key}
        className="flex-1 items-center justify-center active:opacity-70"
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
        hitSlop={4}
      >
        <Ionicons
          name={tab.icon}
          size={25}
          color={focused ? NAV_COLORS.iconActive : NAV_COLORS.icon}
        />
        {/* A small dot marks where you are, since the icons carry no labels. */}
        <View
          className="mt-1.5 h-1 w-1 rounded-full"
          style={{
            backgroundColor: focused ? NAV_COLORS.iconActive : "transparent",
          }}
        />
      </Pressable>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-4"
      style={{ bottom: barOffset(insets.bottom) }}
    >
      <View
        className="flex-row items-center rounded-full px-2"
        style={{
          height: TAB_BAR_HEIGHT,
          backgroundColor: NAV_COLORS.pill,
          borderWidth: 1,
          borderColor: NAV_COLORS.pillEdge,
          boxShadow: "0 14px 32px rgba(0, 0, 0, 0.55)",
        }}
      >
        {renderTab(0)}
        {renderTab(1)}
        <View style={{ width: ACTION_SIZE + 16 }} />
        {renderTab(2)}
        {renderTab(3)}
      </View>

      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 items-center"
        style={{ top: -ACTION_RISE }}
      >
        <Pressable
          className="items-center justify-center rounded-full active:opacity-90"
          style={{
            width: ACTION_SIZE,
            height: ACTION_SIZE,
            boxShadow: `0 0 22px ${NAV_COLORS.glow}, 0 6px 14px rgba(0, 0, 0, 0.45)`,
          }}
          onPress={() => router.push("/log-round")}
          accessibilityRole="button"
          accessibilityLabel="Log a round"
        >
          <PearlButton size={ACTION_SIZE} />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Iridescent pearl: a pale base with soft pink, lavender and cyan swirls, a
 * specular highlight top-left and a darker rim, with a thin plus on top.
 */
function PearlButton({ size }: { size: number }) {
  const r = size / 2;
  const arm = size * 0.17;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id="pearlBase" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F2F6FF" />
          <Stop offset="0.55" stopColor="#D9E3FA" />
          <Stop offset="1" stopColor="#C6D2F2" />
        </LinearGradient>
        <RadialGradient id="swirlPink" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#F3A6E8" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#F3A6E8" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="swirlLilac" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#B8A4F5" stopOpacity="0.8" />
          <Stop offset="1" stopColor="#B8A4F5" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="swirlCyan" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A6E6F7" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#A6E6F7" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="sheen" cx="34%" cy="26%" r="45%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="rim" cx="50%" cy="50%" r="50%">
          <Stop offset="0.78" stopColor="#6B78A8" stopOpacity="0" />
          <Stop offset="1" stopColor="#6B78A8" stopOpacity="0.35" />
        </RadialGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r} fill="url(#pearlBase)" />
      {/* Swirls, rotated ellipses so they read as flowing streaks */}
      <Ellipse
        cx={size * 0.3}
        cy={size * 0.42}
        rx={size * 0.28}
        ry={size * 0.14}
        fill="url(#swirlPink)"
        transform={`rotate(-35 ${size * 0.3} ${size * 0.42})`}
      />
      <Ellipse
        cx={size * 0.68}
        cy={size * 0.68}
        rx={size * 0.3}
        ry={size * 0.13}
        fill="url(#swirlLilac)"
        transform={`rotate(-40 ${size * 0.68} ${size * 0.68})`}
      />
      <Ellipse
        cx={size * 0.72}
        cy={size * 0.28}
        rx={size * 0.22}
        ry={size * 0.12}
        fill="url(#swirlCyan)"
        transform={`rotate(30 ${size * 0.72} ${size * 0.28})`}
      />
      <Ellipse
        cx={size * 0.42}
        cy={size * 0.84}
        rx={size * 0.24}
        ry={size * 0.08}
        fill="url(#swirlPink)"
        transform={`rotate(-15 ${size * 0.42} ${size * 0.84})`}
      />
      <Ellipse
        cx={size * 0.22}
        cy={size * 0.7}
        rx={size * 0.14}
        ry={size * 0.1}
        fill="url(#swirlCyan)"
      />
      <Circle cx={r} cy={r} r={r} fill="url(#sheen)" />
      <Circle cx={r} cy={r} r={r} fill="url(#rim)" />
      <Circle
        cx={r}
        cy={r}
        r={r - 0.75}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.7}
        strokeWidth={1.5}
      />
      {/* The plus */}
      <Line
        x1={r - arm}
        y1={r}
        x2={r + arm}
        y2={r}
        stroke={NAV_COLORS.plus}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <Line
        x1={r}
        y1={r - arm}
        x2={r}
        y2={r + arm}
        stroke={NAV_COLORS.plus}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}
