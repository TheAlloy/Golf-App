import { Ionicons } from '@expo/vector-icons';
import { geoOrthographic, geoPath } from 'd3-geo';
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { LAND } from '@/components/globe';
import { Text } from '@/components/ui/text';
import { colors, GLOBE_COLORS } from '@/constants/theme';

export type MapAppearance = 'map' | 'satellite' | 'terrain';

const LOOKS: { id: MapAppearance; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' },
];

/** Same Blue Marble texture the satellite view wraps onto the globe. */
const BLUE_MARBLE = require('../../assets/earth/blue-marble.jpg');
const TEXTURE_W = 4096;
const TEXTURE_H = 2048;

/** Side of the round button, border included. Shared so the Map / List toggle can match it. */
export const APPEARANCE_BUTTON_SIZE = 46;
const SIZE = APPEARANCE_BUTTON_SIZE;
const BORDER = 2;
const INNER = SIZE - BORDER * 2;
/** Gap between the circles in the open menu. */
const GAP = 8;
const OPEN_MS = 220;

/**
 * The round layers button in the top right. Pressing it fans out the three
 * looks, Map, Satellite and Terrain, as thumbnails, with the one on screen
 * ringed and named in green. A tap anywhere else closes the fan.
 */
export function AppearanceButton({
  appearance,
  onAppearanceChange,
}: {
  appearance: MapAppearance;
  onAppearanceChange: (next: MapAppearance) => void;
}) {
  const button = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ right: number; top: number } | null>(null);
  const current = LOOKS.find((l) => l.id === appearance) ?? LOOKS[0];

  const open = () => {
    button.current?.measureInWindow((x, y, w, h) => setAnchor({ right: x + w, top: y + h + GAP }));
  };
  const close = () => setAnchor(null);

  return (
    <>
      {/* A stack of layers: the button for how the globe is drawn. */}
      <Pressable
        ref={button}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`View options. ${current.label} view`}
        accessibilityState={{ expanded: anchor !== null }}
        className="items-center justify-center rounded-full border border-border bg-card/90 active:opacity-80"
        style={{ width: SIZE, height: SIZE }}
      >
        <Ionicons name="layers-outline" size={22} color={colors.foreground} />
      </Pressable>

      <Modal visible={anchor !== null} transparent animationType="none" onRequestClose={close}>
        <Pressable className="flex-1" onPress={close} accessibilityLabel="Close">
          {anchor && (
            <Fan anchor={anchor}>
              {LOOKS.map((look, i) => {
                const selected = appearance === look.id;
                return (
                  <FanRow
                    key={look.id}
                    index={i}
                    label={look.label}
                    selected={selected}
                    onPress={() => {
                      onAppearanceChange(look.id);
                      close();
                    }}
                    accessibilityLabel={`${look.label} view`}
                    accessibilityState={{ selected }}
                  >
                    <View
                      style={{
                        ...thumbStyle,
                        borderColor: selected ? colors.primaryBright : thumbStyle.borderColor,
                      }}
                    >
                      <Patch look={look.id} />
                    </View>
                  </FanRow>
                );
              })}
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

/** An option's name, green when it's the one in effect. */
function Chip({ label, selected }: { label: string; selected?: boolean }) {
  return (
    <View
      className={
        selected ? 'rounded-full bg-primary px-3 py-1' : 'rounded-full bg-card/90 px-3 py-1'
      }
    >
      <Text
        className={
          selected
            ? 'font-semibold text-xs text-primary-foreground'
            : 'font-semibold text-xs text-foreground'
        }
      >
        {label}
      </Text>
    </View>
  );
}

/** One circle with its name beside it, arriving a beat after the one above. */
function FanRow({
  index,
  label,
  selected,
  onPress,
  accessibilityLabel,
  accessibilityState,
  children,
}: {
  index: number;
  label: string;
  /** The option in effect: its name chip goes green. */
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityState?: { selected?: boolean };
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
        onPress={onPress}
        accessibilityRole="menuitem"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
      >
        <Chip label={label} selected={selected} />
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** A thumbnail of each look over the same patch of the world. */
function Patch({ look }: { look: MapAppearance }) {
  if (look === 'map') return <MapPatch />;
  return (
    <View style={{ width: INNER, height: INNER }}>
      <SatellitePatch />
      {look === 'terrain' && (
        // The same muting and lift the shader gives the base texture in terrain.
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: INNER,
            height: INNER,
            backgroundColor: 'rgba(235, 228, 212, 0.62)',
          }}
        />
      )}
    </View>
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
