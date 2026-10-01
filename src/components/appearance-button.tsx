import { geoOrthographic, geoPath } from 'd3-geo';
import { useMemo } from 'react';
import { Image, Pressable, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { LAND } from '@/components/globe';
import { GLOBE_COLORS } from '@/constants/theme';

export type MapAppearance = 'map' | 'terrain';

/** Same Blue Marble texture the terrain view wraps onto the globe. */
const BLUE_MARBLE = require('../../assets/earth/blue-marble.jpg');
const TEXTURE_W = 4096;
const TEXTURE_H = 2048;

/** Side of the square thumbnail, border included. Shared so the Map / List toggle can match it. */
export const APPEARANCE_BUTTON_SIZE = 46;
const SIZE = APPEARANCE_BUTTON_SIZE;
const BORDER = 2;
const INNER = SIZE - BORDER * 2;

/**
 * A thumbnail of the appearance you'd switch to, in the style of the layer
 * button in Google Earth: a small bordered square showing a patch of the
 * world in the other look. Tapping it swaps appearances.
 */
export function AppearanceButton({
  appearance,
  onPress,
}: {
  appearance: MapAppearance;
  onPress: () => void;
}) {
  const next: MapAppearance = appearance === 'map' ? 'terrain' : 'map';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={next === 'terrain' ? 'Switch to terrain view' : 'Switch to map view'}
      className="active:opacity-80"
      style={{
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        borderWidth: BORDER,
        borderColor: 'rgba(255, 255, 255, 0.92)',
        overflow: 'hidden',
        backgroundColor: GLOBE_COLORS.ocean,
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
      }}
    >
      {next === 'terrain' ? <SatellitePatch /> : <MapPatch />}
    </Pressable>
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
