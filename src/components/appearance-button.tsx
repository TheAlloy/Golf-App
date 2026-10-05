import { Ionicons } from '@expo/vector-icons';
import { geoOrthographic, geoPath } from 'd3-geo';
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { LAND } from '@/components/globe';
import { Text } from '@/components/ui/text';
import { colors, GLOBE_COLORS } from '@/constants/theme';
import { COVERAGE_LEVELS, CoverageLevel, coverageNote } from '@/lib/coverage';

export type MapAppearance = 'map' | 'terrain';

/** Same Blue Marble texture the terrain view wraps onto the globe. */
const BLUE_MARBLE = require('../../assets/earth/blue-marble.jpg');
const TEXTURE_W = 4096;
const TEXTURE_H = 2048;

/** Side of the round thumbnail, border included. Shared so the Map / List toggle can match it. */
export const APPEARANCE_BUTTON_SIZE = 46;
const SIZE = APPEARANCE_BUTTON_SIZE;
const BORDER = 2;
const INNER = SIZE - BORDER * 2;
/** Gap between the circles in the open menu. */
const GAP = 8;
const OPEN_MS = 220;

type IconName = keyof typeof Ionicons.glyphMap;

/** The four shading levels, as circles under the appearance switch. */
const LEVEL_ICONS: Record<Exclude<CoverageLevel, 'off'>, IconName> = {
  cities: 'pin',
  states: 'map',
  countries: 'flag',
  continents: 'earth',
};

/**
 * The round layer button in the top right, in the style of Google Earth's: a
 * thumbnail of the look currently on screen. Pressing it fans out five circles
 * underneath: that other look, then the four "where I've played" shading
 * levels, each a toggle. A tap anywhere else closes the fan.
 */
export function AppearanceButton({
  appearance,
  onAppearanceChange,
  coverage,
  onCoverageChange,
}: {
  appearance: MapAppearance;
  onAppearanceChange: (next: MapAppearance) => void;
  coverage: CoverageLevel;
  onCoverageChange: (level: CoverageLevel) => void;
}) {
  const button = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ right: number; top: number } | null>(null);
  const next: MapAppearance = appearance === 'map' ? 'terrain' : 'map';
  // Shading is drawn by the vector map; over imagery it has nothing to sit on.
  const shadingAvailable = appearance === 'map';
  const current = COVERAGE_LEVELS.find((l) => l.id === coverage) ?? COVERAGE_LEVELS[0];

  const open = () => {
    button.current?.measureInWindow((x, y, w, h) => setAnchor({ right: x + w, top: y + h + GAP }));
  };
  const close = () => setAnchor(null);

  return (
    <>
      <Pressable
        ref={button}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`View options. ${appearance === 'map' ? 'Map' : 'Terrain'} view, shading ${current.label.toLowerCase()}`}
        accessibilityState={{ expanded: anchor !== null }}
        className="active:opacity-80"
        style={thumbStyle}
      >
        {/* The look on screen now; the fan below offers the other. */}
        {appearance === 'terrain' ? <SatellitePatch /> : <MapPatch />}
      </Pressable>

      <Modal visible={anchor !== null} transparent animationType="none" onRequestClose={close}>
        <Pressable className="flex-1" onPress={close} accessibilityLabel="Close">
          {anchor && (
            <Fan anchor={anchor}>
              <FanRow
                index={0}
                label={next === 'terrain' ? 'Terrain' : 'Map'}
                onPress={() => {
                  onAppearanceChange(next);
                  close();
                }}
                accessibilityLabel={`Switch to ${next} view`}
              >
                <View style={thumbStyle}>
                  {next === 'terrain' ? <SatellitePatch /> : <MapPatch />}
                </View>
              </FanRow>
              {COVERAGE_LEVELS.filter((l) => l.id !== 'off').map((level, i) => {
                const id = level.id as Exclude<CoverageLevel, 'off'>;
                const active = coverage === id;
                return (
                  <FanRow
                    key={id}
                    index={i + 1}
                    label={level.label}
                    hint={active ? (coverageNote(id) ?? undefined) : undefined}
                    disabled={!shadingAvailable}
                    onPress={() => {
                      onCoverageChange(active ? 'off' : id);
                      close();
                    }}
                    accessibilityLabel={`${active ? 'Stop shading' : 'Shade'} ${level.label.toLowerCase()} you've played`}
                    accessibilityState={{ selected: active, disabled: !shadingAvailable }}
                  >
                    <View
                      className="items-center justify-center rounded-full border"
                      style={{
                        width: SIZE,
                        height: SIZE,
                        backgroundColor: active ? colors.primary : 'hsla(0, 0%, 7%, 0.92)',
                        borderColor: active ? colors.primary : colors.border,
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
                      }}
                    >
                      <Ionicons
                        name={active ? LEVEL_ICONS[id] : (`${LEVEL_ICONS[id]}-outline` as IconName)}
                        size={18}
                        color={active ? colors.primaryForeground : colors.foreground}
                      />
                    </View>
                  </FanRow>
                );
              })}
              {!shadingAvailable && (
                <View className="rounded-full bg-card/90 px-3 py-1">
                  <Text className="text-[10px] text-muted-foreground">
                    Shading shows on the map view
                  </Text>
                </View>
              )}
            </Fan>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const thumbStyle = {
  width: SIZE,
  height: SIZE,
  borderRadius: SIZE / 2,
  borderWidth: BORDER,
  borderColor: 'rgba(255, 255, 255, 0.92)',
  overflow: 'hidden' as const,
  backgroundColor: GLOBE_COLORS.ocean,
  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
};

/** The column of circles, right-aligned under the button, unfolding as it opens. */
function Fan({
  anchor,
  children,
}: {
  anchor: { right: number; top: number };
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: OPEN_MS, useNativeDriver: true }).start();
  }, [progress]);
  return (
    <FanProgress.Provider value={progress}>
      <View
        style={{
          position: 'absolute',
          right: width - anchor.right,
          top: anchor.top,
          alignItems: 'flex-end',
          gap: GAP,
        }}
        accessibilityRole="menu"
      >
        {children}
      </View>
    </FanProgress.Provider>
  );
}

const FanProgress = createContext<Animated.Value | null>(null);

/** One circle with its name beside it, arriving a beat after the one above. */
function FanRow({
  index,
  label,
  hint,
  disabled,
  onPress,
  accessibilityLabel,
  accessibilityState,
  children,
}: {
  index: number;
  label: string;
  hint?: string;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityState?: { selected?: boolean; disabled?: boolean };
  children: ReactNode;
}) {
  const progress = useContext(FanProgress);
  // Each row starts a little after the previous one, so the fan unrolls downward.
  const start = Math.min(0.6, index * 0.12);
  const opacity = progress
    ? progress.interpolate({
        inputRange: [start, Math.min(1, start + 0.4)],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      })
    : 1;
  const translateY = progress
    ? progress.interpolate({
        inputRange: [start, Math.min(1, start + 0.4)],
        outputRange: [-10, 0],
        extrapolate: 'clamp',
      })
    : 0;
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        className="flex-row items-center gap-2 active:opacity-80"
        style={{ opacity: disabled ? 0.55 : 1 }}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="menuitem"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
      >
        <View className="items-end">
          <View className="rounded-full bg-card/90 px-3 py-1">
            <Text className="font-semibold text-xs text-foreground">{label}</Text>
          </View>
          {hint && <Text className="mt-1 text-[10px] text-muted-foreground">{hint}</Text>}
        </View>
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** Western Europe and north Africa, cropped straight out of the satellite texture. */
function SatellitePatch() {
  // A 50°×50° window: longitude −15…35, latitude 20…70.
  const spanPx = (50 / 360) * TEXTURE_W;
  const k = INNER / spanPx;
  const left = -((165 / 360) * TEXTURE_W) * k;
  const top = -((20 / 180) * TEXTURE_H) * k;
  return (
    <View style={{ width: INNER, height: INNER, overflow: 'hidden' }}>
      <Image
        source={BLUE_MARBLE}
        style={{
          position: 'absolute',
          left,
          top,
          width: TEXTURE_W * k,
          height: TEXTURE_H * k,
        }}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

/** The same region drawn in the dark map palette. */
function MapPatch() {
  const land = useMemo(() => {
    const projection = geoOrthographic()
      .scale(INNER * 1.9)
      .translate([INNER * 0.55, INNER * 0.1])
      .rotate([2, -40])
      .clipAngle(90);
    const path = geoPath(projection);
    return LAND.features.map((f) => path(f as never)).filter((d): d is string => Boolean(d));
  }, []);
  return (
    <Svg width={INNER} height={INNER} viewBox={`0 0 ${INNER} ${INNER}`}>
      <Defs>
        <RadialGradient id="thumb-ocean" cx="30%" cy="25%" r="90%">
          <Stop offset="0%" stopColor={GLOBE_COLORS.oceanHigh} />
          <Stop offset="100%" stopColor={GLOBE_COLORS.oceanDeep} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={INNER} height={INNER} fill="url(#thumb-ocean)" />
      {land.map((d, i) => (
        <Path
          key={i}
          d={d}
          fill={GLOBE_COLORS.land}
          stroke={GLOBE_COLORS.landStroke}
          strokeWidth={0.5}
        />
      ))}
    </Svg>
  );
}
