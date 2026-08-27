import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, PanResponder, View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import * as topojson from 'topojson-client';
import countries110m from 'world-atlas/countries-110m.json';

import { GLOBE_COLORS, HEAT_STOPS } from '@/constants/theme';
import { HeatCell, heatIntensity } from '@/lib/heat-cells';

const LAND = topojson.feature(
  countries110m as never,
  (countries110m as never as { objects: { countries: never } }).objects.countries
) as unknown as GeoJSON.FeatureCollection;

const GRATICULE = geoGraticule10();

/** Deterministic star field — identical on every render and reload. */
const STARS = (() => {
  let seed = 20260827;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: 140 }, () => ({
    x: rand(),
    y: rand(),
    r: 0.3 + rand() * 1.2,
    o: 0.15 + rand() * 0.55,
  }));
})();

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;

export type GlobeMarker = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
};

type Props = {
  width: number;
  height: number;
  /** Glow blobs, one per cluster of courses you have played. */
  cells?: HeatCell[];
  /** Individual courses, revealed as you zoom in. */
  markers?: GlobeMarker[];
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onSelectMarker?: (id: string) => void;
  /** Where the globe faces on first render, as [longitude, latitude]. */
  initialCentre?: [number, number] | null;
};

export default function Globe({
  width,
  height,
  cells = [],
  markers = [],
  zoom = MIN_ZOOM,
  onZoomChange,
  onSelectMarker,
  initialCentre = null,
}: Props) {
  const [rotation, setRotation] = useState<[number, number]>([70, -15]);
  const rotationRef = useRef<[number, number]>([70, -15]);
  const gestureStart = useRef<[number, number]>([70, -15]);
  // Once the user drags, the globe is theirs and never re-centres itself.
  const userDriving = useRef(false);
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  const moved = useRef(0);
  const spanRef = useRef(Math.min(width, height));
  const zoomRef = useRef(zoom);
  const onZoomRef = useRef(onZoomChange);
  const tapRef = useRef<((e: GestureResponderEvent) => void) | null>(null);

  useEffect(() => {
    spanRef.current = Math.min(width, height);
    zoomRef.current = zoom;
    onZoomRef.current = onZoomChange;
  }, [height, onZoomChange, width, zoom]);

  // The sphere is sized off the shorter edge so it always fits, but the canvas
  // fills the screen so a zoomed-in view has no empty bands.
  const cx = width / 2;
  const cy = height / 2;
  const scale = (Math.min(width, height) / 2 - 2) * zoom;

  const projection = useMemo(
    () =>
      geoOrthographic()
        .scale(scale)
        .translate([cx, cy])
        .rotate([rotation[0], rotation[1]])
        .clipAngle(90),
    [cx, cy, rotation, scale]
  );

  /** Turn a tap into the nearest visible marker, if one is close enough. */
  const handleTap = useCallback(
    (e: GestureResponderEvent) => {
      if (!onSelectMarker || markers.length === 0) return;
      const { locationX, locationY } = e.nativeEvent;
      let best: { id: string; d: number } | null = null;
      for (const m of markers) {
        const xy = projection([m.longitude, m.latitude]);
        if (!xy) continue;
        const d = Math.hypot(xy[0] - locationX, xy[1] - locationY);
        if (d < 28 && (!best || d < best.d)) best = { id: m.id, d };
      }
      if (best) onSelectMarker(best.id);
    },
    [markers, onSelectMarker, projection]
  );

  useEffect(() => {
    tapRef.current = handleTap;
  }, [handleTap]);

  // Face wherever the player has been, as soon as that is known. d3 rotates
  // the world beneath the viewer, so facing a point means negating it.
  useEffect(() => {
    if (!initialCentre || userDriving.current) return;
    const next: [number, number] = [-initialCentre[0], -initialCentre[1]];
    rotationRef.current = next;
    gestureStart.current = next;
    setRotation(next);
  }, [initialCentre]);

  const [panHandlers, setPanHandlers] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        userDriving.current = true;
        gestureStart.current = rotationRef.current;
        pinchStart.current = null;
        moved.current = 0;
        void e;
      },
      onPanResponderMove: (e, g) => {
        const touches = e.nativeEvent.touches;
        moved.current = Math.max(moved.current, Math.abs(g.dx) + Math.abs(g.dy));

        if (touches.length === 2) {
          const [a, b] = touches;
          const distance = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          if (!pinchStart.current) {
            pinchStart.current = { distance, zoom: zoomRef.current };
            return;
          }
          const next = Math.min(
            MAX_ZOOM,
            Math.max(MIN_ZOOM, (pinchStart.current.zoom * distance) / pinchStart.current.distance)
          );
          onZoomRef.current?.(next);
          return;
        }

        pinchStart.current = null;
        const [l0, p0] = gestureStart.current;
        // Slow the drag as you zoom in, so a close-up stays controllable.
        const speed = 180 / zoomRef.current;
        const lambda = l0 + (g.dx / spanRef.current) * speed;
        const phi = Math.max(-85, Math.min(85, p0 - (g.dy / spanRef.current) * speed));
        rotationRef.current = [lambda, phi];
        setRotation([lambda, phi]);
      },
      onPanResponderRelease: (e) => {
        // A press that barely moved is a tap, not a drag.
        if (moved.current < 6) tapRef.current?.(e);
        pinchStart.current = null;
      },
    });
    setPanHandlers(responder.panHandlers as unknown as Record<string, unknown>);
  }, []);

  const { landPaths, graticulePath, blobs, pins } = useMemo(() => {
    const path = geoPath(projection);
    const centre: [number, number] = [-rotation[0], -rotation[1]];
    const visible = (lng: number, lat: number) => geoDistance([lng, lat], centre) < Math.PI / 2;

    const landPaths = LAND.features
      .map((f) => path(f as never))
      .filter((d): d is string => Boolean(d));

    const blobs = cells
      .filter((c) => visible(c.longitude, c.latitude))
      .map((c) => {
        const xy = projection([c.longitude, c.latitude]);
        if (!xy) return null;
        const t = heatIntensity(c.courses);
        return {
          cx: xy[0],
          cy: xy[1],
          // Blobs grow with the cluster and with zoom, so they stay readable.
          r: (24 + t * 52) * Math.min(2.4, Math.sqrt(zoom)),
          stop: t < 0.34 ? 0 : t < 0.7 ? 1 : 2,
          core: 2 + t * 3.5,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    // Individual courses only appear once you are close enough to tell them
    // apart; below that the blobs carry the story.
    const placed =
      zoom < 1.8
        ? []
        : markers
            .filter((m) => visible(m.longitude, m.latitude))
            .map((m) => {
              const xy = projection([m.longitude, m.latitude]);
              return xy ? { id: m.id, label: m.label, cx: xy[0], cy: xy[1] } : null;
            })
            .filter((d): d is NonNullable<typeof d> => d !== null);

    // Label only what can be read: in a tight cluster the names would stack on
    // top of each other, so keep the first and drop any that would collide.
    const labelled: { cx: number; cy: number }[] = [];
    const pins = placed.map((p) => {
      const clear = labelled.every((l) => Math.hypot(l.cx - p.cx, l.cy - p.cy) > 56);
      if (clear) labelled.push({ cx: p.cx, cy: p.cy });
      return { ...p, showLabel: clear };
    });

    return { landPaths, graticulePath: path(GRATICULE as never) ?? '', blobs, pins };
  }, [cells, markers, projection, rotation, zoom]);

  return (
    <View {...(panHandlers ?? {})}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="ocean" cx="38%" cy="32%" r="72%">
            <Stop offset="0%" stopColor={GLOBE_COLORS.oceanHigh} />
            <Stop offset="62%" stopColor={GLOBE_COLORS.ocean} />
            <Stop offset="100%" stopColor={GLOBE_COLORS.oceanDeep} />
          </RadialGradient>
          <RadialGradient id="atmosphere" cx="50%" cy="50%" r="50%">
            <Stop offset="90%" stopColor={GLOBE_COLORS.atmosphere} stopOpacity="0" />
            <Stop offset="96.5%" stopColor={GLOBE_COLORS.atmosphere} stopOpacity="0.16" />
            <Stop offset="99%" stopColor={GLOBE_COLORS.atmosphere} stopOpacity="0.30" />
            <Stop offset="100%" stopColor={GLOBE_COLORS.atmosphere} stopOpacity="0" />
          </RadialGradient>
          {/* One gradient per ramp stop, reused by every blob at that level. */}
          {HEAT_STOPS.map((c, i) => (
            <RadialGradient key={i} id={`heat${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={c} stopOpacity="0.85" />
              <Stop offset="28%" stopColor={c} stopOpacity="0.42" />
              <Stop offset="58%" stopColor={c} stopOpacity="0.16" />
              <Stop offset="100%" stopColor={c} stopOpacity="0" />
            </RadialGradient>
          ))}
          <ClipPath id="viewport">
            <Rect x="0" y="0" width={width} height={height} />
          </ClipPath>
        </Defs>

        <G clipPath="url(#viewport)">
          {STARS.map((st, i) => (
            <Circle
              key={`s${i}`}
              cx={st.x * width}
              cy={st.y * height}
              r={st.r}
              fill="#FFFFFF"
              opacity={st.o}
            />
          ))}

          {/* Halo, sphere, then a crisp limb so the edge reads as a horizon. */}
          <Circle cx={cx} cy={cy} r={scale * 1.05} fill="url(#atmosphere)" />
          <Circle cx={cx} cy={cy} r={scale} fill="url(#ocean)" />
          <Circle
            cx={cx}
            cy={cy}
            r={scale}
            fill="none"
            stroke={GLOBE_COLORS.limb}
            strokeWidth={0.8}
            opacity={0.32}
          />

          <Path d={graticulePath} stroke={GLOBE_COLORS.graticule} strokeWidth={0.5} fill="none" />

          {landPaths.map((d, i) => (
            <Path
              key={`l${i}`}
              d={d}
              fill={GLOBE_COLORS.land}
              stroke={GLOBE_COLORS.landStroke}
              strokeWidth={0.5}
            />
          ))}

          {/* Soft glow first, bright core on top — the city-lights look. */}
          {blobs.map((b, i) => (
            <Circle key={`g${i}`} cx={b.cx} cy={b.cy} r={b.r} fill={`url(#heat${b.stop})`} />
          ))}
          {blobs.map((b, i) => (
            <Circle
              key={`c${i}`}
              cx={b.cx}
              cy={b.cy}
              r={b.core}
              fill={HEAT_STOPS[b.stop]}
              opacity={0.95}
            />
          ))}

          {pins.map((p) => (
            <G key={p.id}>
              <Circle cx={p.cx} cy={p.cy} r={5} fill={GLOBE_COLORS.pin} opacity={0.25} />
              <Circle cx={p.cx} cy={p.cy} r={2.4} fill={GLOBE_COLORS.pin} />
              {zoom >= 3 && p.showLabel && (
                <SvgText
                  x={p.cx}
                  y={p.cy - 9}
                  fill={GLOBE_COLORS.pinLabel}
                  fontSize={8}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {p.label}
                </SvgText>
              )}
            </G>
          ))}
        </G>
      </Svg>
    </View>
  );
}
