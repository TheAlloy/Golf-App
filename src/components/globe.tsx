import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderHandlers, PanResponder, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import * as topojson from 'topojson-client';
import countries110m from 'world-atlas/countries-110m.json';

import { GLOBE_COLORS, HEAT_RAMP } from '@/constants/theme';
import { CoursePoint } from '@/data/course-catalogue';
import { catalogueHeatCells, maxCellCount } from '@/lib/heat-cells';
import { Continent } from '@/models/types';

// Land geometry, converted from topojson once at module load.
const LAND = topojson.feature(
  countries110m as never,
  (countries110m as never as { objects: { countries: never } }).objects.countries
) as unknown as GeoJSON.FeatureCollection;

const GRATICULE = geoGraticule10();

/**
 * A fixed star field behind the globe. Generated once from a seeded generator
 * so the sky is identical on every render and across reloads.
 */
const STARS = (() => {
  let seed = 20260827;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: 90 }, () => ({
    x: rand(),
    y: rand(),
    r: 0.4 + rand() * 1.1,
    o: 0.25 + rand() * 0.5,
  }));
})();

/** Rough label anchors, matching the continent read-outs in the design. */
const CONTINENT_ANCHORS: Record<Continent, [number, number]> = {
  'North America': [-100, 45],
  'South America': [-60, -15],
  Europe: [15, 50],
  Africa: [20, 5],
  Asia: [95, 40],
  Australia: [134, -25],
};

type Props = {
  size: number;
  /** Courses the user has played — drawn as bright accent points. */
  playedPoints?: CoursePoint[];
  /** Per-continent counts to label, if any. */
  continentCounts?: Partial<Record<Continent, number>>;
  /** Show the density heat blobs for the whole catalogue. */
  showHeat?: boolean;
  interactive?: boolean;
};

function heatColor(count: number, max: number): string {
  const t = Math.min(1, Math.log(count + 1) / Math.log(max + 1));
  if (t < 0.5) return HEAT_RAMP[0];
  if (t < 0.8) return HEAT_RAMP[1];
  return HEAT_RAMP[2];
}

export default function Globe({
  size,
  playedPoints = [],
  continentCounts,
  showHeat = true,
  interactive = true,
}: Props) {
  const [rotation, setRotation] = useState<[number, number]>([70, -15]);

  // The gesture handler is created once and reads live values through refs,
  // so dragging never rebuilds it mid-gesture.
  const rotationRef = useRef<[number, number]>([70, -15]);
  const gestureStart = useRef<[number, number]>([70, -15]);
  const sizeRef = useRef(size);
  const interactiveRef = useRef(interactive);

  useEffect(() => {
    sizeRef.current = size;
    interactiveRef.current = interactive;
  }, [interactive, size]);

  // Built in an effect rather than during render: the handlers close over
  // refs, and refs must not be read while rendering.
  const [panHandlers, setPanHandlers] = useState<GestureResponderHandlers | null>(null);

  useEffect(() => {
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => interactiveRef.current,
      onMoveShouldSetPanResponder: () => interactiveRef.current,
      onPanResponderGrant: () => {
        gestureStart.current = rotationRef.current;
      },
      onPanResponderMove: (_e, g) => {
        const [l0, p0] = gestureStart.current;
        // Drag right spins the globe east; clamp tilt so it never flips over.
        const lambda = l0 + (g.dx / sizeRef.current) * 180;
        const phi = Math.max(-80, Math.min(80, p0 - (g.dy / sizeRef.current) * 180));
        rotationRef.current = [lambda, phi];
        setRotation([lambda, phi]);
      },
    });
    setPanHandlers(responder.panHandlers);
  }, []);

  const radius = size / 2;

  const { landPaths, graticulePath, heatDots, playedDots, labels } = useMemo(() => {
    const projection = geoOrthographic()
      .scale(radius - 1)
      .translate([radius, radius])
      .rotate([rotation[0], rotation[1]])
      .clipAngle(90);
    const path = geoPath(projection);

    // The point directly facing the viewer; anything more than 90° away is
    // on the far side of the globe and must not be drawn.
    const centre: [number, number] = [-rotation[0], -rotation[1]];
    const visible = (lng: number, lat: number) => geoDistance([lng, lat], centre) < Math.PI / 2;

    const landPaths = LAND.features
      .map((f) => path(f as never))
      .filter((d): d is string => Boolean(d));

    const max = maxCellCount();
    const heatDots = showHeat
      ? catalogueHeatCells()
          .filter((c) => visible(c.longitude, c.latitude))
          .map((c) => {
            const xy = projection([c.longitude, c.latitude]);
            if (!xy) return null;
            return {
              cx: xy[0],
              cy: xy[1],
              r: 1.1 + Math.min(3.4, Math.log(c.count + 1) * 1.15),
              fill: heatColor(c.count, max),
            };
          })
          .filter((d): d is NonNullable<typeof d> => d !== null)
      : [];

    const playedDots = playedPoints
      .filter((p) => visible(p.longitude, p.latitude))
      .map((p) => {
        const xy = projection([p.longitude, p.latitude]);
        return xy ? { cx: xy[0], cy: xy[1] } : null;
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    const labels = continentCounts
      ? (Object.entries(continentCounts) as [Continent, number][])
          .filter(([continent]) => {
            const [lng, lat] = CONTINENT_ANCHORS[continent];
            return visible(lng, lat);
          })
          .map(([continent, count]) => {
            const [lng, lat] = CONTINENT_ANCHORS[continent];
            const xy = projection([lng, lat]);
            return xy ? { continent, count, x: xy[0], y: xy[1] } : null;
          })
          .filter((l): l is NonNullable<typeof l> => l !== null)
      : [];

    return { landPaths, graticulePath: path(GRATICULE as never) ?? '', heatDots, playedDots, labels };
  }, [continentCounts, playedPoints, radius, rotation, showHeat]);

  return (
    <View {...(interactive && panHandlers ? panHandlers : {})}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="ocean" cx="35%" cy="30%" r="75%">
            <Stop offset="0%" stopColor="hsl(222, 44%, 12%)" />
            <Stop offset="70%" stopColor={GLOBE_COLORS.ocean} />
            <Stop offset="100%" stopColor="hsl(222, 50%, 3%)" />
          </RadialGradient>
          <RadialGradient id="atmosphere" cx="50%" cy="50%" r="50%">
            <Stop offset="88%" stopColor={GLOBE_COLORS.atmosphere} stopOpacity="0" />
            <Stop offset="97%" stopColor={GLOBE_COLORS.atmosphere} stopOpacity="0.35" />
            <Stop offset="100%" stopColor={GLOBE_COLORS.atmosphere} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {STARS.map((st, i) => (
          <Circle
            key={`s${i}`}
            cx={st.x * size}
            cy={st.y * size}
            r={st.r}
            fill="#FFFFFF"
            opacity={st.o}
          />
        ))}

        {/* Atmosphere sits behind the sphere so it reads as a rim glow. */}
        <Circle cx={radius} cy={radius} r={radius} fill="url(#atmosphere)" />
        <Circle cx={radius} cy={radius} r={radius - 1} fill="url(#ocean)" />

        <Path d={graticulePath} stroke={GLOBE_COLORS.graticule} strokeWidth={0.5} fill="none" />

        <G>
          {landPaths.map((d, i) => (
            <Path
              key={i}
              d={d}
              fill={GLOBE_COLORS.land}
              stroke={GLOBE_COLORS.landStroke}
              strokeWidth={0.4}
            />
          ))}
        </G>

        {heatDots.map((dot, i) => (
          <Circle key={`h${i}`} cx={dot.cx} cy={dot.cy} r={dot.r} fill={dot.fill} opacity={0.75} />
        ))}

        {playedDots.map((dot, i) => (
          <G key={`p${i}`}>
            <Circle cx={dot.cx} cy={dot.cy} r={7} fill={GLOBE_COLORS.played} opacity={0.18} />
            <Circle cx={dot.cx} cy={dot.cy} r={3} fill={GLOBE_COLORS.played} />
          </G>
        ))}

        {labels.map((l) => (
          <G key={l.continent}>
            <SvgText
              x={l.x}
              y={l.y}
              fill="hsl(210, 20%, 92%)"
              fontSize={9}
              fontWeight="600"
              textAnchor="middle"
            >
              {l.continent.toUpperCase()}
            </SvgText>
            <SvgText
              x={l.x}
              y={l.y + 13}
              fill={GLOBE_COLORS.played}
              fontSize={12}
              fontWeight="700"
              textAnchor="middle"
            >
              {String(l.count)}
            </SvgText>
          </G>
        ))}
      </Svg>
    </View>
  );
}
