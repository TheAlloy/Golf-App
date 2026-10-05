import { geoBounds, geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  GestureResponderEvent,
  PanResponder,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  LinearGradient,
  Ellipse,
  G,
  Image as SvgImage,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import * as topojson from 'topojson-client';
import countries110m from 'world-atlas/countries-110m.json';
import countries50m from 'world-atlas/countries-50m.json';

import TerrainLayer, { ImageryStatus } from '@/components/terrain-layer';
import {
  continentShade,
  GLOBE_COLORS,
  GLOBE_RELIEF_COLORS,
  GLOBE_TERRAIN_COLORS,
} from '@/constants/theme';
import { CoverageShape } from '@/lib/coverage';
import { Continent } from '@/models/types';
import { project, TILE_PX } from '@/lib/geo';
import { courseTileUrl } from '@/lib/imagery';

export const LAND = topojson.feature(
  countries110m as never,
  (countries110m as never as { objects: { countries: never } }).objects.countries
) as unknown as GeoJSON.FeatureCollection;

/** Zoom from which coastlines come from the 1:50m dataset instead of 1:110m. */
const FINE_ZOOM = 4;

// The finer coastlines are parsed on first use, since most sessions never
// zoom far enough to need them.
let fineLandCache: GeoJSON.FeatureCollection | null = null;
function fineLand(): GeoJSON.FeatureCollection {
  if (!fineLandCache) {
    fineLandCache = topojson.feature(
      countries50m as never,
      (countries50m as never as { objects: { countries: never } }).objects.countries
    ) as unknown as GeoJSON.FeatureCollection;
  }
  return fineLandCache;
}

type Bounds = [[number, number], [number, number]];
const boundsCache = new WeakMap<GeoJSON.Feature, Bounds>();
function boundsOf(f: GeoJSON.Feature): Bounds {
  let b = boundsCache.get(f);
  if (!b) {
    b = geoBounds(f as never) as Bounds;
    boundsCache.set(f, b);
  }
  return b;
}

/**
 * The longitude/latitude window a fully zoomed-in viewport shows, or null when
 * the globe's edge is on screen (then everything may be visible). Lets a deep
 * zoom skip the countries that are nowhere near the screen.
 */
function visibleWindow(
  invert: (p: [number, number]) => [number, number] | null,
  width: number,
  height: number
): Bounds | null {
  const corners: [number, number][] = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ];
  let lon0 = Infinity;
  let lon1 = -Infinity;
  let lat0 = Infinity;
  let lat1 = -Infinity;
  for (const c of corners) {
    const g = invert(c);
    if (!g) return null;
    lon0 = Math.min(lon0, g[0]);
    lon1 = Math.max(lon1, g[0]);
    lat0 = Math.min(lat0, g[1]);
    lat1 = Math.max(lat1, g[1]);
  }
  // Straddling the antimeridian or a pole: don't try to be clever.
  if (lon1 - lon0 > 180) return null;
  return [
    [lon0, lat0],
    [lon1, lat1],
  ];
}

function overlaps(a: Bounds, b: Bounds): boolean {
  return a[0][0] <= b[1][0] && a[1][0] >= b[0][0] && a[0][1] <= b[1][1] && a[1][1] >= b[0][1];
}

const GRATICULE = geoGraticule10();

export const MIN_ZOOM = 1;
/**
 * Far enough that a single town fills the screen (~0.6 km per pixel). The
 * bundled imagery and coastlines run out of detail well before this, so a
 * deep zoom goes soft rather than stopping short.
 */
export const MAX_ZOOM = 64;

/** Gap between the fully zoomed-out globe and the edges of the screen. */
export const GLOBE_EDGE_PADDING = 24;

/** Sphere radius: fits the shorter edge with padding, then scales with zoom. */
function globeRadius(width: number, height: number, zoom: number): number {
  return (Math.min(width, height) / 2 - GLOBE_EDGE_PADDING) * zoom;
}

export type GlobeMarker = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  /** Played courses pin in green; wishlisted ones in lime yellow. */
  kind?: 'played' | 'wishlist';
  /** Status line for the close-up callout, e.g. "Played · 3 rounds". */
  detail?: string;
};

/** Length of the dissolve between the map and terrain looks. */
const APPEARANCE_FADE_MS = 240;
/** From this zoom the pins become flags with a name-and-status callout. */
export const FLAG_ZOOM = 5;
/** How quickly zoom eases toward its target; lower is snappier. */
const ZOOM_EASE_MS = 160;

/** How quickly a flung globe slows: velocity halves roughly every 150 ms. */
const INERTIA_TAU_MS = 220;
/** Below this (degrees per ms) a coasting globe is considered stopped. */
const INERTIA_STOP = 0.004;

type Props = {
  width: number;
  height: number;
  /** Individual courses, revealed as you zoom in. */
  markers?: GlobeMarker[];
  /** Areas to shade as played (countries, states, discs…), as GeoJSON features. */
  coverage?: CoverageShape[];
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onSelectMarker?: (id: string) => void;
  /** Where the globe faces on first render, as [longitude, latitude]. */
  initialCentre?: [number, number] | null;
  /** Dark map styling, satellite imagery, or a shaded-relief terrain map. */
  appearance?: 'map' | 'satellite' | 'terrain';
  /** Streamed-imagery state, for the attribution chip in satellite and terrain views. */
  onImageryStatus?: (status: ImageryStatus) => void;
};

export default function Globe({
  width,
  height,
  markers = [],
  coverage = [],
  zoom = MIN_ZOOM,
  onZoomChange,
  onSelectMarker,
  initialCentre = null,
  appearance = 'map',
  onImageryStatus,
}: Props) {
  // Satellite and terrain are both drawn by the GL layer; the map is not.
  const terrain = appearance !== 'map';
  // How far into the imagery the picture is, 0 to 1. A change of appearance
  // eases this over APPEARANCE_FADE_MS, and the two looks are drawn on top
  // of each other with complementary opacity, so one dissolves into the other.
  const [mix, setMix] = useState(terrain ? 1 : 0);
  const [mixAnim] = useState(() => new Animated.Value(terrain ? 1 : 0));
  // Once terrain has been shown its GL layer stays mounted (idle while
  // hidden), so later switches don't spend the fade's first frames setting
  // the GPU up again.
  const [terrainUsed, setTerrainUsed] = useState(terrain);
  useEffect(() => {
    const id = mixAnim.addListener(({ value }) => {
      setMix(value);
      if (value > 0) setTerrainUsed(true);
    });
    Animated.timing(mixAnim, {
      toValue: terrain ? 1 : 0,
      duration: APPEARANCE_FADE_MS,
      useNativeDriver: false,
    }).start();
    return () => mixAnim.removeListener(id);
  }, [terrain, mixAnim]);
  // Colours that can't be blended switch over halfway through.
  const pal =
    mix > 0.5
      ? appearance === 'terrain'
        ? GLOBE_RELIEF_COLORS
        : GLOBE_TERRAIN_COLORS
      : GLOBE_COLORS;
  const mapOpacity = 1 - mix;
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
  const sizeRef = useRef({ width, height });
  // Where the globe's canvas sits in the window, so finger positions (page
  // coordinates) can be turned into canvas coordinates.
  const offsetRef = useRef({ x: 0, y: 0 });
  const moved = useRef(0);
  // Pointer moves can arrive several times a frame; one render per frame is plenty.
  const rotationFrame = useRef(0);
  const pendingRotation = useRef<[number, number] | null>(null);
  // Recent drag positions, for the fling velocity on release.
  const dragSamples = useRef<{ t: number; l: number; p: number }[]>([]);
  const inertiaFrame = useRef(0);
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
        .clipAngle(90)
        // Cut geometry to the screen so a deep zoom doesn't emit miles of path.
        .clipExtent([
          [0, 0],
          [width, height],
        ]),
    [cx, cy, rotation, scale, width, height]
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
        // Up close the flag and its callout stand above the spot, so aim the
        // hit area at them rather than at the base of the pole.
        const lift = zoomRef.current >= FLAG_ZOOM ? 24 : 0;
        const d = Math.hypot(xy[0] - locationX, xy[1] - lift - locationY);
        if (d < (lift ? 34 : 28) && (!best || d < best.d)) best = { id: m.id, d };
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
   * Set zoom to `next` at once, keeping whatever is under (fx, fy) in place,
   * so a pinch over Scotland zooms into Scotland rather than the middle of
   * the screen. Off the globe, it zooms about the centre.
   */
  const projectAt = useCallback((z: number, rot: [number, number]) => {
    const { width: w, height: h } = sizeRef.current;
    return geoOrthographic()
      .scale(globeRadius(w, h, z))
      .translate([w / 2, h / 2])
      .rotate(rot)
      .clipAngle(90);
  }, []);

  /** The [lng, lat] under screen point (fx, fy) right now, if it's on the globe. */
  const geoUnder = useCallback(
    (fx: number, fy: number) =>
      projectAt(zoomRef.current, rotationRef.current).invert?.([fx, fy]) ?? null,
    [projectAt]
  );

  const applyZoom = useCallback(
    (next: number, fx: number, fy: number, anchor?: [number, number] | null) => {
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
      let rot = rotationRef.current;
      // The place that must stay under (fx, fy). An animation passes one fixed
      // anchor for all its frames, so small per-frame errors can't add up.
      const target = anchor === undefined ? geoUnder(fx, fy) : anchor;
      if (target) {
        // "Rotate by the error" until the anchor sits under the focal point.
        for (let i = 0; i < 6; i++) {
          const now = projectAt(clamped, rot).invert?.([fx, fy]);
          if (!now) break;
          if (Math.abs(target[0] - now[0]) + Math.abs(target[1] - now[1]) < 1e-5) break;
          rot = [
            rot[0] - (target[0] - now[0]),
            Math.max(-85, Math.min(85, rot[1] - (target[1] - now[1]))),
          ];
        }
        rotationRef.current = rot;
        gestureStart.current = rot;
        setRotation(rot);
      }
      userDriving.current = true;
      zoomRef.current = clamped;
      onZoomRef.current?.(clamped);
    },
    [geoUnder, projectAt]
  );

  // Smooth zoom: gestures and the wheel set a target, and each frame eases
  // the real zoom toward it. Wheel notches then glide instead of jumping.
  const zoomTarget = useRef<number | null>(null);
  const zoomFocus = useRef({ x: 0, y: 0 });
  const zoomAnchor = useRef<[number, number] | null>(null);
  const zoomFrame = useRef(0);
  const reduceMotionRef = useRef(false);

  /** Set the rotation, rendering at most once per animation frame. */
  const commitRotation = useCallback((rot: [number, number]) => {
    rotationRef.current = rot;
    pendingRotation.current = rot;
    if (rotationFrame.current) return;
    rotationFrame.current = requestAnimationFrame(() => {
      rotationFrame.current = 0;
      if (pendingRotation.current) setRotation(pendingRotation.current);
    });
  }, []);

  const stopInertia = useCallback(() => {
    if (inertiaFrame.current) cancelAnimationFrame(inertiaFrame.current);
    inertiaFrame.current = 0;
  }, []);

  /** Let a released drag coast to a stop. */
  const fling = useCallback(
    (vl: number, vp: number) => {
      if (reduceMotionRef.current) return;
      let last = 0;
      const step = (now: number) => {
        // Real elapsed time (capped for a stalled tab), so the coast lasts the
        // same wall-clock time whatever the frame rate.
        const dt = last ? Math.min(now - last, 100) : 16;
        last = now;
        const [l, p] = rotationRef.current;
        commitRotation([l + vl * dt, Math.max(-85, Math.min(85, p + vp * dt))]);
        const decay = Math.exp(-dt / INERTIA_TAU_MS);
        vl *= decay;
        vp *= decay;
        if (Math.hypot(vl, vp) < INERTIA_STOP) {
          inertiaFrame.current = 0;
          return;
        }
        inertiaFrame.current = requestAnimationFrame(step);
      };
      inertiaFrame.current = requestAnimationFrame(step);
    },
    [commitRotation]
  );

  useEffect(
    () => () => {
      cancelAnimationFrame(rotationFrame.current);
      cancelAnimationFrame(inertiaFrame.current);
    },
    []
  );

  const zoomAt = useCallback(
    (next: number, fx: number, fy: number) => {
      const target = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
      zoomFocus.current = { x: fx, y: fy };
      // Measure what is under the fingers once per event, not every frame.
      zoomAnchor.current = geoUnder(fx, fy);
      stopInertia();
      if (reduceMotionRef.current) {
        zoomTarget.current = null;
        applyZoom(target, fx, fy, zoomAnchor.current);
        return;
      }
      zoomTarget.current = target;
      if (zoomFrame.current) return;
      let last = 0;
      const step = (now: number) => {
        const goal = zoomTarget.current;
        if (goal === null) {
          zoomFrame.current = 0;
          return;
        }
        const dt = last ? Math.min(now - last, 64) : 16;
        last = now;
        const current = zoomRef.current;
        const { x, y } = zoomFocus.current;
        if (Math.abs(goal - current) < 0.002) {
          applyZoom(goal, x, y, zoomAnchor.current);
          zoomTarget.current = null;
          zoomFrame.current = 0;
          return;
        }
        applyZoom(
          current + (goal - current) * (1 - Math.exp(-dt / ZOOM_EASE_MS)),
          x,
          y,
          zoomAnchor.current
        );
        zoomFrame.current = requestAnimationFrame(step);
      };
      zoomFrame.current = requestAnimationFrame(step);
    },
    [applyZoom, geoUnder, stopInertia]
  );

  useEffect(() => () => cancelAnimationFrame(zoomFrame.current), []);

  const commitRotationRef = useRef(commitRotation);
  const stopInertiaRef = useRef(stopInertia);
  const flingRef = useRef(fling);
  useEffect(() => {
    commitRotationRef.current = commitRotation;
    stopInertiaRef.current = stopInertia;
    flingRef.current = fling;
  }, [commitRotation, stopInertia, fling]);

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
        stopInertiaRef.current();
        dragSamples.current = [];
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
        commitRotationRef.current([lambda, phi]);
        const now = Date.now();
        const samples = dragSamples.current;
        samples.push({ t: now, l: lambda, p: phi });
        while (samples.length > 6 || (samples.length > 2 && now - samples[0].t > 120)) {
          samples.shift();
        }
      },
      onPanResponderRelease: (e) => {
        // A press that barely moved is a tap, not a drag.
        if (moved.current < 6 && !pinched.current) tapRef.current?.(e);
        else if (!pinched.current) {
          // Fling: carry on at the speed of the last few moves, then coast.
          const samples = dragSamples.current;
          const first = samples[0];
          const lastSample = samples[samples.length - 1];
          const dt = first && lastSample ? lastSample.t - first.t : 0;
          if (first && lastSample && dt >= 16 && Date.now() - lastSample.t < 80) {
            flingRef.current((lastSample.l - first.l) / dt, (lastSample.p - first.p) / dt);
          }
        }
        pinchStart.current = null;
        pinched.current = false;
        dragSamples.current = [];
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
    // Build on the pending target, so quick wheel ticks add up.
    const zoomBy = (factor: number) =>
      zoomAtRef.current((zoomTarget.current ?? zoomRef.current) * factor, focus.x, focus.y);
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

  // Respect the system's reduce-motion setting: zoom snaps instead of easing.
  useEffect(() => {
    let live = true;
    const update = (on: boolean) => {
      reduceMotionRef.current = on;
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => live && update(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  const { landPaths, coveragePaths, graticulePath, pins } = useMemo(() => {
    const path = geoPath(projection);
    const centre: [number, number] = [-rotation[0], -rotation[1]];
    const visible = (lng: number, lat: number) => geoDistance([lng, lat], centre) < Math.PI / 2;

    const coveragePaths = coverage
      .map((c) => ({ d: path(c.feature as never), continent: c.continent }))
      .filter((c): c is { d: string; continent: Continent } => Boolean(c.d));

    // Finer coastlines once zoomed in, and only the countries that can be on screen.
    const fine = zoom >= FINE_ZOOM;
    const source = fine ? fineLand() : LAND;
    const win = fine ? visibleWindow((p) => projection.invert?.(p) ?? null, width, height) : null;
    const landPaths = source.features
      .filter((f) => !win || overlaps(boundsOf(f), win))
      .map((f) => path(f as never))
      .filter((d): d is string => Boolean(d));

    // Every course gets a dot at every zoom, green for played and lime yellow for
    // wishlisted, so the two always read apart; names wait for zoom 3.
    const placed = markers
      .filter((m) => visible(m.longitude, m.latitude))
      .map((m) => {
        const xy = projection([m.longitude, m.latitude]);
        if (!xy) return null;
        const kind = m.kind ?? 'played';
        const detail = m.detail ?? (kind === 'wishlist' ? 'Wishlist' : 'Played');
        return {
          id: m.id,
          label: m.label,
          kind,
          detail,
          cx: xy[0],
          cy: xy[1],
          longitude: m.longitude,
          latitude: m.latitude,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    // Label only what can be read. Up close each flag carries a callout box;
    // further out, a bare name. Either way, anything that would overlap one
    // already placed is dropped, so a tight cluster stays legible.
    const flags = zoom >= FLAG_ZOOM;
    const placedBoxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
    const pins = placed.map((p) => {
      const callout = flags ? calloutFor(p.label, p.detail, p.cx, p.cy) : null;
      const box = callout
        ? {
            x0: callout.x - 2,
            y0: callout.y - 2,
            x1: callout.x + callout.w + 2,
            y1: callout.y + callout.h + 2,
          }
        : { x0: p.cx - 28, y0: p.cy - 16, x1: p.cx + 28, y1: p.cy };
      const clear = placedBoxes.every(
        (o) => box.x1 < o.x0 || box.x0 > o.x1 || box.y1 < o.y0 || box.y0 > o.y1
      );
      if (clear) placedBoxes.push(box);
      return { ...p, showLabel: clear, callout };
    });

    return { landPaths, coveragePaths, graticulePath: path(GRATICULE as never) ?? '', pins };
  }, [coverage, markers, projection, rotation, zoom, width, height]);

  return (
    <View ref={container} {...(panHandlers ?? {})} style={{ width, height }}>
      {/* Satellite imagery on the GPU; the SVG above it leaves the disc clear. */}
      {terrainUsed && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: mixAnim }]} pointerEvents="none">
          <TerrainLayer
            width={width}
            height={height}
            cx={cx}
            cy={cy}
            radius={scale}
            rotation={rotation}
            onStatus={onImageryStatus}
            active={mix > 0}
            look={appearance === 'terrain' ? 'terrain' : 'satellite'}
          />
        </Animated.View>
      )}
      {/* Positioned so the vector layer paints above the absolutely placed GL canvas. */}
      <Svg width={width} height={height} style={{ position: 'relative', zIndex: 1 }}>
        <Defs>
          <RadialGradient id="ocean" cx="38%" cy="32%" r="72%">
            <Stop offset="0%" stopColor={pal.oceanHigh} />
            <Stop offset="62%" stopColor={pal.ocean} />
            <Stop offset="100%" stopColor={pal.oceanDeep} />
          </RadialGradient>
          <RadialGradient id="atmosphere" cx="50%" cy="50%" r="50%">
            <Stop offset="90%" stopColor={pal.atmosphere} stopOpacity="0" />
            <Stop offset="96.5%" stopColor={pal.atmosphere} stopOpacity="0.16" />
            <Stop offset="99%" stopColor={pal.atmosphere} stopOpacity="0.30" />
            <Stop offset="100%" stopColor={pal.atmosphere} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={GLOBE_COLORS.oceanDeep} stopOpacity="0.92" />
            <Stop offset="100%" stopColor={GLOBE_COLORS.oceanDeep} stopOpacity="0" />
          </LinearGradient>
          <ClipPath id="viewport">
            <Rect x="0" y="0" width={width} height={height} />
          </ClipPath>
        </Defs>

        <G clipPath="url(#viewport)">
          {/* Halo, sphere, then a crisp limb so the edge reads as a horizon. */}
          <Circle cx={cx} cy={cy} r={scale * 1.05} fill="url(#atmosphere)" />
          {mix < 1 && <Circle cx={cx} cy={cy} r={scale} fill="url(#ocean)" opacity={mapOpacity} />}
          <Circle
            cx={cx}
            cy={cy}
            r={scale}
            fill="none"
            stroke={pal.limb}
            strokeWidth={0.8}
            opacity={0.32}
          />

          {mix < 1 && (
            <Path
              d={graticulePath}
              stroke={GLOBE_COLORS.graticule}
              strokeWidth={0.5}
              fill="none"
              opacity={mapOpacity}
            />
          )}

          {/* Terrain only: imagery can fill the screen, so shade the header strip. */}
          {mix > 0 && (
            <Rect x={0} y={0} width={width} height={180} fill="url(#scrim)" opacity={mix} />
          )}

          {/* Terrain keeps only faint borders over the imagery, like Earth does;
              the map's land fill fades away underneath. */}
          {landPaths.map((d, i) => (
            <Path
              key={`l${i}`}
              d={d}
              fill={GLOBE_COLORS.land}
              fillOpacity={mapOpacity}
              stroke={pal.landStroke}
              strokeWidth={mix > 0.5 ? 0.4 : 0.5}
            />
          ))}

          {/* Where you've played, shaded over the land at the chosen level. */}
          {coveragePaths.map(({ d, continent }, i) => {
            const shade = continentShade(continent);
            return (
              <Path key={`cov${i}`} d={d} fill={shade.fill} stroke={shade.edge} strokeWidth={0.7} />
            );
          })}

          {pins.map((p) => {
            const color = p.kind === 'wishlist' ? pal.wishlist : pal.pin;
            if (p.callout) return <FlagPin key={p.id} cx={p.cx} cy={p.cy} color={color} />;
            return (
              <G key={p.id}>
                <Circle
                  cx={p.cx}
                  cy={p.cy}
                  r={2.3}
                  fill={color}
                  stroke={mix > 0.5 ? 'rgba(0, 0, 0, 0.5)' : undefined}
                  strokeWidth={0.8}
                />
                {zoom >= 3 && p.showLabel && (
                  <SvgText
                    x={p.cx}
                    y={p.cy - 8}
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
            );
          })}

          {/* Callouts on their own layer, so no flag ever pokes through one. */}
          {pins.map((p) =>
            p.callout && p.showLabel ? (
              <Callout
                key={`callout-${p.id}`}
                {...p.callout}
                id={p.id}
                longitude={p.longitude}
                latitude={p.latitude}
                detail={p.detail}
                color={p.kind === 'wishlist' ? pal.wishlist : pal.pin}
              />
            ) : null
          )}
        </G>
      </Svg>
    </View>
  );
}

/** Height of a flag pole, from the course's spot on the ground. */
const POLE = 18;
const CALLOUT_H = 44;
const CALLOUT_MAX_W = 256;
const CALLOUT_NAME_SIZE = 12;
const CALLOUT_DETAIL_SIZE = 10;
/** Satellite thumbnail of the course at the left of the callout. */
const THUMB = 32;
const THUMB_INSET = (CALLOUT_H - THUMB) / 2;
/** Where the text starts: after the thumbnail and a gap. */
const CALLOUT_TEXT_X = THUMB_INSET + THUMB + 8;
/** Tile zoom for the thumbnail: one tile is about 700 m across, a course's worth. */
const THUMB_ZOOM = 15;

/** Callout geometry, sized from the text since SVG text can't be measured. */
function calloutFor(name: string, detail: string, cx: number, cy: number) {
  const label = name.length > 30 ? `${name.slice(0, 29)}…` : name;
  // Manrope runs about 0.56em per character at these weights.
  const text = Math.max(
    label.length * CALLOUT_NAME_SIZE * 0.56,
    detail.length * CALLOUT_DETAIL_SIZE * 0.56
  );
  const w = Math.min(CALLOUT_MAX_W, CALLOUT_TEXT_X + text + 12);
  return { x: cx - w / 2, y: cy - POLE - 8 - CALLOUT_H, w, h: CALLOUT_H, label };
}

/**
 * Satellite tiles covering a square window centred on a point, placed in a
 * thumbnail of the given size. Up to four tiles meet in the window.
 */
function thumbTiles(longitude: number, latitude: number, size: number) {
  const p = project({ latitude, longitude }, THUMB_ZOOM);
  const half = TILE_PX / 2;
  const scale = size / TILE_PX;
  const tiles: { key: string; url: string; x: number; y: number }[] = [];
  for (const tx of new Set([
    Math.floor((p.x - half) / TILE_PX),
    Math.floor((p.x + half) / TILE_PX),
  ])) {
    for (const ty of new Set([
      Math.floor((p.y - half) / TILE_PX),
      Math.floor((p.y + half) / TILE_PX),
    ])) {
      tiles.push({
        key: `${tx}/${ty}`,
        url: courseTileUrl(THUMB_ZOOM, tx, ty),
        x: (tx * TILE_PX - (p.x - half)) * scale,
        y: (ty * TILE_PX - (p.y - half)) * scale,
      });
    }
  }
  return { tiles, tileSize: TILE_PX * scale };
}

/** A golf flag planted at (cx, cy): shadow, pole and pennant. */
function FlagPin({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  const top = cy - POLE;
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={3.4} ry={1.3} fill="#000" opacity={0.45} />
      <Line
        x1={cx}
        y1={cy}
        x2={cx}
        y2={top}
        stroke={GLOBE_COLORS.pinLabel}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <Path
        d={`M${cx + 0.6} ${top} L${cx + 11} ${top + 3.6} L${cx + 0.6} ${top + 7.2} Z`}
        fill={color}
      />
      <Circle cx={cx} cy={cy} r={1.6} fill={color} />
    </G>
  );
}

/**
 * Floating box above a flag: a satellite thumbnail of the course on the
 * left, with its name and status set against the thumbnail's right edge.
 * Where the tiles can't load, a green disc with a flag stands in.
 */
function Callout({
  id,
  x,
  y,
  w,
  h,
  label,
  detail,
  color,
  longitude,
  latitude,
}: {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  detail: string;
  color: string;
  longitude: number;
  latitude: number;
}) {
  const tx = x + THUMB_INSET;
  const ty = y + THUMB_INSET;
  const clipId = `thumb-${id}`;
  const { tiles, tileSize } = thumbTiles(longitude, latitude, THUMB);
  return (
    <G>
      <Rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={12}
        fill={GLOBE_COLORS.callout}
        stroke={GLOBE_COLORS.calloutEdge}
        strokeWidth={1}
      />
      <Defs>
        <ClipPath id={clipId}>
          <Rect x={tx} y={ty} width={THUMB} height={THUMB} rx={8} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Rect x={tx} y={ty} width={THUMB} height={THUMB} fill="hsl(150, 30%, 16%)" />
        <Path
          d={`M${tx + 15} ${ty + 23} v-12 l8 3 l-8 3`}
          fill="none"
          stroke="hsla(0, 0%, 100%, 0.7)"
          strokeWidth={1.4}
        />
        {tiles.map((t) => (
          <SvgImage
            key={t.key}
            href={{ uri: t.url }}
            x={tx + t.x}
            y={ty + t.y}
            width={tileSize}
            height={tileSize}
            preserveAspectRatio="none"
          />
        ))}
      </G>
      <SvgText
        x={x + CALLOUT_TEXT_X}
        y={y + 18}
        fill={GLOBE_COLORS.pinLabel}
        fontSize={CALLOUT_NAME_SIZE}
        fontFamily="Manrope_600SemiBold"
        fontWeight="600"
        textAnchor="start"
      >
        {label}
      </SvgText>
      <SvgText
        x={x + CALLOUT_TEXT_X}
        y={y + 33}
        fill={color}
        fontSize={CALLOUT_DETAIL_SIZE}
        fontFamily="Manrope_600SemiBold"
        fontWeight="600"
        textAnchor="start"
      >
        {detail}
      </SvgText>
    </G>
  );
}
