import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  GestureResponderEvent,
  PanResponder,
  Platform,
  View,
} from 'react-native';
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

/** Gap between the fully zoomed-out globe and the edges of the screen. */
export const GLOBE_EDGE_PADDING = 16;

/** Sphere radius: fits the shorter edge with padding, then scales with zoom. */
function globeRadius(width: number, height: number, zoom: number): number {
  return (Math.min(width, height) / 2 - GLOBE_EDGE_PADDING) * zoom;
}

export type GlobeMarker = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  /** Played courses pin in lime; wishlisted ones in pink. */
  kind?: 'played' | 'wishlist';
};

/** How long the globe waits without interaction before turning on its own. */
export const IDLE_SPIN_DELAY_MS = 10_000;
/** Idle spin speed at zoom 1, in degrees per second (a turn a minute). */
const IDLE_SPIN_DEG_PER_SEC = 6;

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
  /**
   * Turn slowly on its own after IDLE_SPIN_DELAY_MS without interaction.
   * Pass false while the globe is off screen so it doesn't burn frames.
   */
  idleSpin?: boolean;
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
  idleSpin = true,
}: Props) {
  const [rotation, setRotation] = useState<[number, number]>([70, -15]);
  const rotationRef = useRef<[number, number]>([70, -15]);
  const gestureStart = useRef<[number, number]>([70, -15]);
  // Once the user drags, the globe is theirs and never re-centres itself.
  const userDriving = useRef(false);
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  // Set once a gesture has used two fingers, so its end is never read as a tap.
  const pinched = useRef(false);
  // Drag offset at the moment a pinch dropped back to one finger, so the
  // remaining finger carries on from where the globe is rather than jumping.
  const dragOrigin = useRef({ dx: 0, dy: 0 });
  const container = useRef<View>(null);
  // Any touch, drag, pinch or wheel pushes the idle spin back another 10s.
  const lastInteraction = useRef(0);
  const sizeRef = useRef({ width, height });
  // Where the globe's canvas sits in the window, so finger positions (page
  // coordinates) can be turned into canvas coordinates.
  const offsetRef = useRef({ x: 0, y: 0 });
  const moved = useRef(0);
  const spanRef = useRef(Math.min(width, height));
  const zoomRef = useRef(zoom);
  const onZoomRef = useRef(onZoomChange);
  const tapRef = useRef<((e: GestureResponderEvent) => void) | null>(null);

  useEffect(() => {
    spanRef.current = Math.min(width, height);
    sizeRef.current = { width, height };
    zoomRef.current = zoom;
    onZoomRef.current = onZoomChange;
  }, [height, onZoomChange, width, zoom]);

  // The sphere is sized off the shorter edge so it always fits, but the canvas
  // fills the screen so a zoomed-in view has no empty bands.
  const cx = width / 2;
  const cy = height / 2;
  const scale = globeRadius(width, height, zoom);

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

  /**
   * Zoom to `next` while keeping whatever is under (fx, fy) in place, so a
   * pinch over Scotland zooms into Scotland rather than the middle of the
   * screen. Off the globe, it zooms about the centre.
   */
  const zoomAt = useCallback((next: number, fx: number, fy: number) => {
    const { width: w, height: h } = sizeRef.current;
    const project = (z: number, rot: [number, number]) =>
      geoOrthographic()
        .scale(globeRadius(w, h, z))
        .translate([w / 2, h / 2])
        .rotate(rot)
        .clipAngle(90);

    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    let rot = rotationRef.current;
    const target = project(zoomRef.current, rot).invert?.([fx, fy]);
    if (target) {
      // Two passes of "rotate by the error" converge well for small steps.
      for (let i = 0; i < 2; i++) {
        const now = project(clamped, rot).invert?.([fx, fy]);
        if (!now) break;
        rot = [rot[0] - (target[0] - now[0]), Math.max(-85, Math.min(85, rot[1] - (target[1] - now[1])))];
      }
      rotationRef.current = rot;
      gestureStart.current = rot;
      setRotation(rot);
    }
    userDriving.current = true;
    lastInteraction.current = Date.now();
    zoomRef.current = clamped;
    onZoomRef.current?.(clamped);
  }, []);

  const zoomAtRef = useRef(zoomAt);
  useEffect(() => {
    zoomAtRef.current = zoomAt;
  }, [zoomAt]);

  const [panHandlers, setPanHandlers] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        userDriving.current = true;
        lastInteraction.current = Date.now();
        gestureStart.current = rotationRef.current;
        pinchStart.current = null;
        pinched.current = e.nativeEvent.touches.length > 1;
        dragOrigin.current = { dx: 0, dy: 0 };
        moved.current = 0;
        const el = container.current as unknown as HTMLElement | View | null;
        if (Platform.OS === 'web') {
          const rect = (el as HTMLElement | null)?.getBoundingClientRect?.();
          if (rect) offsetRef.current = { x: rect.left, y: rect.top };
        } else {
          (el as View | null)?.measureInWindow?.((x, y) => (offsetRef.current = { x, y }));
        }
      },
      onPanResponderMove: (e, g) => {
        lastInteraction.current = Date.now();
        const touches = e.nativeEvent.touches;
        moved.current = Math.max(moved.current, Math.abs(g.dx) + Math.abs(g.dy));

        if (touches.length >= 2) {
          pinched.current = true;
          const [a, b] = touches;
          const distance = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          if (!pinchStart.current) {
            pinchStart.current = { distance, zoom: zoomRef.current };
            return;
          }
          const fx = (a.pageX + b.pageX) / 2 - offsetRef.current.x;
          const fy = (a.pageY + b.pageY) / 2 - offsetRef.current.y;
          zoomAtRef.current(
            (pinchStart.current.zoom * distance) / pinchStart.current.distance,
            fx,
            fy
          );
          return;
        }

        if (pinchStart.current) {
          // Back to one finger after a pinch: restart the drag from here.
          pinchStart.current = null;
          gestureStart.current = rotationRef.current;
          dragOrigin.current = { dx: g.dx, dy: g.dy };
          return;
        }
        const [l0, p0] = gestureStart.current;
        const dx = g.dx - dragOrigin.current.dx;
        const dy = g.dy - dragOrigin.current.dy;
        // Slow the drag as you zoom in, so a close-up stays controllable.
        const speed = 180 / zoomRef.current;
        const lambda = l0 + (dx / spanRef.current) * speed;
        const phi = Math.max(-85, Math.min(85, p0 - (dy / spanRef.current) * speed));
        rotationRef.current = [lambda, phi];
        setRotation([lambda, phi]);
      },
      onPanResponderRelease: (e) => {
        lastInteraction.current = Date.now();
        // A press that barely moved is a tap, not a drag.
        if (moved.current < 6 && !pinched.current) tapRef.current?.(e);
        pinchStart.current = null;
        pinched.current = false;
      },
    });
    setPanHandlers(responder.panHandlers as unknown as Record<string, unknown>);
  }, []);

  // In a browser, a trackpad pinch arrives as ctrl+wheel (Safari sends its own
  // gesture events instead) and would otherwise zoom the whole page. Claim
  // both, plus the plain scroll wheel, for the globe.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = container.current as unknown as HTMLElement | null;
    if (!el) return;
    let focus = { x: 0, y: 0 };
    const setFocus = (e: { clientX: number; clientY: number }) => {
      const rect = el.getBoundingClientRect();
      focus = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const zoomBy = (factor: number) => zoomAtRef.current(zoomRef.current * factor, focus.x, focus.y);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setFocus(e);
      // Pinch deltas are small and fine-grained; wheel notches are large.
      zoomBy(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    };
    let gestureScale = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      setFocus(e as unknown as MouseEvent);
      gestureScale = 1;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const scaleNow = (e as unknown as { scale: number }).scale;
      zoomBy(scaleNow / gestureScale);
      gestureScale = scaleNow;
    };
    el.style.touchAction = 'none';
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('gesturestart', onGestureStart);
    el.addEventListener('gesturechange', onGestureChange);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('gesturestart', onGestureStart);
      el.removeEventListener('gesturechange', onGestureChange);
    };
  }, []);

  // Respect the system's reduce-motion setting: no idle spin at all.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => live && setReduceMotion(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!idleSpin || reduceMotion) return;
    // Coming back on screen counts as a fresh start, so it waits the full
    // delay again rather than spinning the moment you return.
    lastInteraction.current = Date.now();
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = last ? now - last : 0;
      // ~30fps is plenty for a slow turn and halves the redraw cost.
      if (last && dt < 33) return;
      last = now;
      if (Date.now() - lastInteraction.current < IDLE_SPIN_DELAY_MS) return;
      const step = (IDLE_SPIN_DEG_PER_SEC * Math.min(dt, 100)) / 1000 / zoomRef.current;
      const [l, phi] = rotationRef.current;
      const next: [number, number] = [(l + step) % 360, phi];
      rotationRef.current = next;
      setRotation(next);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [idleSpin, reduceMotion]);

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
    // Every course gets a dot at every zoom, lime for played and pink for
    // wishlisted, so the two always read apart; names wait for zoom 3.
    const placed = markers
      .filter((m) => visible(m.longitude, m.latitude))
      .map((m) => {
        const xy = projection([m.longitude, m.latitude]);
        return xy
          ? { id: m.id, label: m.label, kind: m.kind ?? 'played', cx: xy[0], cy: xy[1] }
          : null;
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
    <View ref={container} {...(panHandlers ?? {})}>
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
              <Circle
                cx={p.cx}
                cy={p.cy}
                r={5}
                fill={p.kind === 'wishlist' ? GLOBE_COLORS.wishlist : GLOBE_COLORS.pin}
                opacity={0.25}
              />
              <Circle
                cx={p.cx}
                cy={p.cy}
                r={2.4}
                fill={p.kind === 'wishlist' ? GLOBE_COLORS.wishlist : GLOBE_COLORS.pin}
              />
              {zoom >= 3 && p.showLabel && (
                <SvgText
                  x={p.cx}
                  y={p.cy - 9}
                  fill={GLOBE_COLORS.pinLabel}
                  fontSize={8}
                  fontFamily="Manrope_600SemiBold"
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
