import { geoOrthographic, geoPath } from 'd3-geo';
import { useMemo } from 'react';
import { Pressable } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { LAND } from '@/components/globe';
import { GLOBE_COLORS, GLOBE_TERRAIN_COLORS } from '@/constants/theme';

export type MapAppearance = 'map' | 'terrain';

/** Side of the square thumbnail, border included. */
const SIZE = 46;
const BORDER = 2;
const INNER = SIZE - BORDER * 2;

/**
 * A thumbnail of the appearance you'd switch to, in the style of the layer
 * button in Google Earth: a small bordered square showing a patch of the
 * globe rendered in the other palette. Tapping it swaps appearances.
 */
export function AppearanceButton({
  appearance,
  onPress,
}: {
  appearance: MapAppearance;
  onPress: () => void;
}) {
  const next: MapAppearance = appearance === 'map' ? 'terrain' : 'map';
  const pal = next === 'terrain' ? GLOBE_TERRAIN_COLORS : GLOBE_COLORS;

  // A close-up of western Europe and north Africa, where coast and land
  // both show, so the thumbnail reads as a map at a glance.
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={next === 'terrain' ? 'Switch to terrain view' : 'Switch to map view'}
      className="active:opacity-80"
      style={{
        width: SIZE,
        height: SIZE,
        borderRadius: 12,
        borderWidth: BORDER,
        borderColor: 'rgba(255, 255, 255, 0.92)',
        overflow: 'hidden',
        backgroundColor: pal.ocean,
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
      }}
    >
      <Svg width={INNER} height={INNER} viewBox={`0 0 ${INNER} ${INNER}`}>
        <Defs>
          <RadialGradient id="thumb-ocean" cx="30%" cy="25%" r="90%">
            <Stop offset="0%" stopColor={pal.oceanHigh} />
            <Stop offset="100%" stopColor={pal.oceanDeep} />
          </RadialGradient>
          <RadialGradient id="thumb-shade" cx="30%" cy="25%" r="95%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={INNER} height={INNER} fill="url(#thumb-ocean)" />
        <G>
          {land.map((d, i) => (
            <Path key={i} d={d} fill={pal.land} stroke={pal.landStroke} strokeWidth={0.5} />
          ))}
        </G>
        {next === 'terrain' && (
          <Circle cx={INNER / 2} cy={INNER / 2} r={INNER} fill="url(#thumb-shade)" />
        )}
      </Svg>
    </Pressable>
  );
}
