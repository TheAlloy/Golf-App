import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { colors, GLOBE_COLORS } from '@/constants/theme';
import {
  bearingDeg,
  distanceM,
  formatDistance,
  fromUnits,
  metresPerPixel,
  project,
  TILE_PX,
  toUnits,
  unproject,
} from '@/lib/geo';
import { COURSE_IMAGERY, courseTileUrl } from '@/lib/imagery';
import { Fix } from '@/lib/use-live-location';
import { WindState } from '@/lib/wind';
import { Course, LatLng, LiveRound } from '@/models/types';
import { useAppStore } from '@/store/use-app-store';

type Props = {
  course: Course;
  live: LiveRound;
  fix: Fix | null;
  wind: WindState;
  /** Bottom padding so the controls clear the nav bar. */
  bottomSpace: number;
  /** Top padding so the controls clear the header. */
  topSpace: number;
};

/** Zoom the map opens at: the whole hole in view. */
const START_ZOOM = 16.5;
const MIN_ZOOM = 13;
/** One level past the imagery's deepest, upscaled, so the green fills the screen. */
const MAX_ZOOM = COURSE_IMAGERY.maxZoom + 1;
/** Rings around you, in the chosen units. */
const RINGS = [50, 100, 150, 200, 250];
const EASE_MS = 320;
/** Tiles that must fail with none landing before imagery is declared blocked. */
const BLOCKED_AFTER = 4;

type Camera = { center: LatLng; zoom: number };

/**
 * The course under your feet: satellite tiles with the current hole's flag,
 * the distance to it, rings at rangefinder distances around you, the shots
 * you've pinned and the wind. Drag to pan, pinch or scroll to zoom, tap the
 * green to place the flag.
 */
export default function LiveMap({ course, live, fix, wind, bottomSpace, topSpace }: Props) {
  const setLiveFlag = useAppStore((s) => s.setLiveFlag);
  const dropLivePin = useAppStore((s) => s.dropLivePin);
  const removeLivePin = useAppStore((s) => s.removeLivePin);
  const updateLiveRound = useAppStore((s) => s.updateLiveRound);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const sizeRef = useRef(size);
  const [camera, setCamera] = useState<Camera>({ center: course.coordinate, zoom: START_ZOOM });
  const cameraRef = useRef(camera);
  const [placingFlag, setPlacingFlag] = useState(false);
  // Ride along with the fix until the map is dragged.
  const [following, setFollowing] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const hole = live.currentHole;
  const flag = live.flags[hole];
  const units = live.units;
  const holePins = live.pins.filter((p) => p.hole === hole);

  // Where distances are measured from: the GPS fix, else the last shot
  // pinned on this hole, else wherever the map is pointed.
  const origin = useMemo<{ point: LatLng; source: 'gps' | 'pin' | 'map' }>(() => {
    if (fix) return { point: fix.coordinate, source: 'gps' };
    const last = holePins[holePins.length - 1];
    if (last) return { point: last.coordinate, source: 'pin' };
    return { point: camera.center, source: 'map' };
  }, [fix, holePins, camera.center]);

  // --- camera -------------------------------------------------------------

  const commit = useCallback((next: Camera) => {
    cameraRef.current = next;
    setCamera(next);
  }, []);

  const easeFrame = useRef<number | null>(null);
  const easeTo = useCallback(
    (target: Partial<Camera>) => {
      if (easeFrame.current !== null) cancelAnimationFrame(easeFrame.current);
      const from = cameraRef.current;
      const to = { center: target.center ?? from.center, zoom: target.zoom ?? from.zoom };
      const start = Date.now();
      const step = () => {
        const t = Math.min(1, (Date.now() - start) / EASE_MS);
        const k = 1 - (1 - t) ** 3;
        commit({
          center: {
            latitude: from.center.latitude + (to.center.latitude - from.center.latitude) * k,
            longitude: from.center.longitude + (to.center.longitude - from.center.longitude) * k,
          },
          zoom: from.zoom + (to.zoom - from.zoom) * k,
        });
        if (t < 1) easeFrame.current = requestAnimationFrame(step);
        else easeFrame.current = null;
      };
      step();
    },
    [commit]
  );
  useEffect(
    () => () => {
      if (easeFrame.current !== null) cancelAnimationFrame(easeFrame.current);
    },
    []
  );

  /** Zoom keeping the ground under (fx, fy) still. */
  const zoomAt = useCallback(
    (zoom: number, fx: number, fy: number) => {
      const cam = cameraRef.current;
      const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
      const { width, height } = sizeRef.current;
      const before = project(cam.center, cam.zoom);
      const ground = unproject(before.x + fx - width / 2, before.y + fy - height / 2, cam.zoom);
      const g = project(ground, z);
      const center = unproject(g.x - (fx - width / 2), g.y - (fy - height / 2), z);
      commit({ center, zoom: z });
    },
    [commit]
  );

  /**
   * The clear band of screen between the readout at the top and the buttons
   * at the bottom, where the hole is laid out.
   */
  const viewBand = useCallback(() => {
    const { height } = sizeRef.current;
    const top = topSpace + 120;
    const bottom = height - bottomSpace - 120;
    return { top, bottom: Math.max(top + 80, bottom) };
  }, [topSpace, bottomSpace]);

  /** Camera that puts a point at a given screen y, horizontally centred. */
  const cameraFor = useCallback((point: LatLng, zoom: number, y: number): Camera => {
    const { height } = sizeRef.current;
    const p = project(point, zoom);
    return { center: unproject(p.x, p.y - (y - height / 2), zoom), zoom };
  }, []);

  // A new hole: show its flag, with you in frame when a fix is known.
  const lastHole = useRef(hole);
  useEffect(() => {
    if (lastHole.current === hole) return;
    lastHole.current = hole;
    const target = live.flags[hole];
    if (!target) return;
    const band = viewBand();
    if (fix) {
      const mid = {
        latitude: (fix.coordinate.latitude + target.latitude) / 2,
        longitude: (fix.coordinate.longitude + target.longitude) / 2,
      };
      const span = distanceM(fix.coordinate, target);
      // Fit the hole in about 70% of the clear band.
      const mpp = span / ((band.bottom - band.top) * 0.7);
      const zoom = Math.log2((156_543.03392 * Math.cos((mid.latitude * Math.PI) / 180)) / mpp);
      easeTo(
        cameraFor(mid, Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)), (band.top + band.bottom) / 2)
      );
    } else {
      easeTo(cameraFor(target, cameraRef.current.zoom, (band.top + band.bottom) / 2));
    }
  }, [hole, live.flags, fix, easeTo, viewBand, cameraFor]);

  // Following: the map rides along with the fix until you drag it, keeping
  // you low in the clear band so the hole ahead has the room.
  useEffect(() => {
    if (!following || !fix) return;
    const band = viewBand();
    easeTo(
      cameraFor(fix.coordinate, cameraRef.current.zoom, band.top + (band.bottom - band.top) * 0.78)
    );
  }, [following, fix, easeTo, viewBand, cameraFor]);

  // --- gestures -----------------------------------------------------------

  const container = useRef<View>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const gestureStart = useRef<Camera>(camera);
  const dragOrigin = useRef({ dx: 0, dy: 0 });
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  const pinched = useRef(false);
  const moved = useRef(0);
  const tapRef = useRef<(x: number, y: number) => void>(() => {});
  const zoomAtRef = useRef(zoomAt);
  useEffect(() => {
    zoomAtRef.current = zoomAt;
  }, [zoomAt]);
  const stopFollowing = useRef(() => {});
  useEffect(() => {
    stopFollowing.current = () => setFollowing(false);
  }, []);

  const [panHandlers, setPanHandlers] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        if (easeFrame.current !== null) cancelAnimationFrame(easeFrame.current);
        gestureStart.current = cameraRef.current;
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
        if (moved.current > 6) stopFollowing.current();

        if (touches.length >= 2) {
          pinched.current = true;
          const [a, b] = touches;
          const distance = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          if (!pinchStart.current) {
            pinchStart.current = { distance, zoom: cameraRef.current.zoom };
            return;
          }
          const fx = (a.pageX + b.pageX) / 2 - offsetRef.current.x;
          const fy = (a.pageY + b.pageY) / 2 - offsetRef.current.y;
          zoomAtRef.current(
            pinchStart.current.zoom + Math.log2(distance / pinchStart.current.distance),
            fx,
            fy
          );
          return;
        }
        if (pinchStart.current) {
          pinchStart.current = null;
          gestureStart.current = cameraRef.current;
          dragOrigin.current = { dx: g.dx, dy: g.dy };
          return;
        }
        const start = gestureStart.current;
        const dx = g.dx - dragOrigin.current.dx;
        const dy = g.dy - dragOrigin.current.dy;
        const c = project(start.center, start.zoom);
        commit({ center: unproject(c.x - dx, c.y - dy, start.zoom), zoom: start.zoom });
      },
      onPanResponderRelease: (e) => {
        if (moved.current < 6 && !pinched.current) {
          tapRef.current(
            e.nativeEvent.pageX - offsetRef.current.x,
            e.nativeEvent.pageY - offsetRef.current.y
          );
        }
        pinchStart.current = null;
        pinched.current = false;
      },
    });
    setPanHandlers(responder.panHandlers as unknown as Record<string, unknown>);
  }, [commit]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = container.current as unknown as HTMLElement | null;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAtRef.current(
        cameraRef.current.zoom - e.deltaY * (e.ctrlKey ? 0.01 : 0.002),
        e.clientX - rect.left,
        e.clientY - rect.top
      );
    };
    el.style.touchAction = 'none';
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Tapping the green places the flag while that mode is on.
  useEffect(() => {
    tapRef.current = (x, y) => {
      if (!placingFlag) return;
      const cam = cameraRef.current;
      const { width, height } = sizeRef.current;
      const c = project(cam.center, cam.zoom);
      const point = unproject(c.x + x - width / 2, c.y + y - height / 2, cam.zoom);
      setLiveFlag(hole, point);
      setPlacingFlag(false);
      setNote(`Flag set for hole ${hole}`);
    };
  }, [placingFlag, hole, setLiveFlag]);

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), 2200);
    return () => clearTimeout(timer);
  }, [note]);

  // --- tiles --------------------------------------------------------------

  const [failed, setFailed] = useState(0);
  const [landed, setLanded] = useState(0);
  const blocked = failed >= BLOCKED_AFTER && landed === 0;

  const { width, height } = size;
  const zi = Math.max(0, Math.min(COURSE_IMAGERY.maxZoom, Math.round(camera.zoom)));
  const scale = 2 ** (camera.zoom - zi);
  const tilePx = TILE_PX * scale;
  const centerPx = project(camera.center, zi);
  const toScreen = useCallback(
    (point: LatLng) => {
      const p = project(point, zi);
      return {
        x: (p.x - centerPx.x) * scale + width / 2,
        y: (p.y - centerPx.y) * scale + height / 2,
      };
    },
    [zi, centerPx.x, centerPx.y, scale, width, height]
  );

  const tiles: { key: string; url: string; left: number; top: number }[] = [];
  if (width > 0 && !blocked) {
    const n = 2 ** zi;
    const x0 = Math.floor((centerPx.x - width / 2 / scale) / TILE_PX);
    const x1 = Math.floor((centerPx.x + width / 2 / scale) / TILE_PX);
    const y0 = Math.max(0, Math.floor((centerPx.y - height / 2 / scale) / TILE_PX));
    const y1 = Math.min(n - 1, Math.floor((centerPx.y + height / 2 / scale) / TILE_PX));
    for (let tx = x0; tx <= x1; tx++) {
      for (let ty = y0; ty <= y1; ty++) {
        const wrapped = ((tx % n) + n) % n;
        tiles.push({
          key: `${zi}/${wrapped}/${ty}`,
          url: courseTileUrl(zi, wrapped, ty),
          left: (tx * TILE_PX - centerPx.x) * scale + width / 2,
          top: (ty * TILE_PX - centerPx.y) * scale + height / 2,
        });
      }
    }
  }

  // --- overlay geometry ---------------------------------------------------

  const mpp = metresPerPixel(camera.center.latitude, camera.zoom);
  const me = toScreen(origin.point);
  const flagPt = flag ? toScreen(flag) : null;
  const toFlagM = flag ? distanceM(origin.point, flag) : null;
  const shotBearing = flag ? bearingDeg(origin.point, flag) : null;

  // Wind relative to the shot: along the line it helps or hurts, across it drifts.
  const windRead = useMemo(() => {
    if (wind.kind !== 'ready' || shotBearing === null) return null;
    const blowsTo = (wind.wind.fromDeg + 180) % 360;
    const rel = ((blowsTo - shotBearing + 540) % 360) - 180; // -180..180, 0 = helping
    const along = Math.cos((rel * Math.PI) / 180) * wind.wind.speed;
    const across = Math.sin((rel * Math.PI) / 180) * wind.wind.speed;
    const parts: string[] = [];
    if (Math.abs(along) >= 2)
      parts.push(`${along > 0 ? 'Helping' : 'Into'} ${Math.round(Math.abs(along))}`);
    if (Math.abs(across) >= 2)
      parts.push(`${across > 0 ? 'L→R' : 'R→L'} ${Math.round(Math.abs(across))}`);
    return parts.length ? parts.join(' · ') : 'Calm';
  }, [wind, shotBearing]);

  const pinShots = holePins.map((pin, i) => ({
    pin,
    at: toScreen(pin.coordinate),
    fromPrev: i > 0 ? distanceM(holePins[i - 1].coordinate, pin.coordinate) : null,
  }));
  const lastShot = (() => {
    const all = [...holePins.map((p) => p.coordinate)];
    if (fix) all.push(fix.coordinate);
    if (all.length < 2) return null;
    return distanceM(all[all.length - 2], all[all.length - 1]);
  })();

  const gridStep = 50 / mpp; // 50 m squares behind the imagery
  const gridOffsetX =
    (((width / 2 - ((centerPx.x * scale) % gridStep)) % gridStep) + gridStep) % gridStep;
  const gridOffsetY =
    (((height / 2 - ((centerPx.y * scale) % gridStep)) % gridStep) + gridStep) % gridStep;

  const pinHere = () => {
    const where = fix?.coordinate ?? cameraRef.current.center;
    dropLivePin(where);
    setNote(fix ? 'Pinned where you are' : 'No GPS fix: pinned the map centre');
  };

  const recentre = () => {
    const band = viewBand();
    if (fix) {
      setFollowing(true);
      easeTo(
        cameraFor(
          fix.coordinate,
          Math.max(cameraRef.current.zoom, 17),
          band.top + (band.bottom - band.top) * 0.78
        )
      );
    } else {
      easeTo(
        cameraFor(flag ?? course.coordinate, cameraRef.current.zoom, (band.top + band.bottom) / 2)
      );
      setNote('Waiting for a GPS fix');
    }
  };

  return (
    <View
      ref={container}
      className="flex-1 overflow-hidden bg-background"
      onLayout={(e) => {
        const next = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
        sizeRef.current = next;
        setSize(next);
      }}
      {...panHandlers}
    >
      {/* Ground: a dark fairway green with 50 m squares, under the imagery and
          in its place when tiles can't be fetched. */}
      {width > 0 && (
        <Svg width={width} height={height} style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id="ground" cx="50%" cy="45%" r="75%">
              <Stop offset="0" stopColor="hsl(150, 30%, 13%)" />
              <Stop offset="1" stopColor="hsl(150, 35%, 6%)" />
            </RadialGradient>
          </Defs>
          <Rect width={width} height={height} fill="url(#ground)" />
          {gridStep > 18 &&
            Array.from({ length: Math.ceil(width / gridStep) + 1 }, (_, i) => (
              <Line
                key={`v${i}`}
                x1={gridOffsetX + i * gridStep}
                x2={gridOffsetX + i * gridStep}
                y1={0}
                y2={height}
                stroke="hsla(150, 40%, 60%, 0.08)"
              />
            ))}
          {gridStep > 18 &&
            Array.from({ length: Math.ceil(height / gridStep) + 1 }, (_, i) => (
              <Line
                key={`h${i}`}
                y1={gridOffsetY + i * gridStep}
                y2={gridOffsetY + i * gridStep}
                x1={0}
                x2={width}
                stroke="hsla(150, 40%, 60%, 0.08)"
              />
            ))}
        </Svg>
      )}

      {tiles.map((t) => (
        <Image
          key={t.key}
          source={{ uri: t.url }}
          cachePolicy="memory-disk"
          style={{
            position: 'absolute',
            left: t.left,
            top: t.top,
            width: tilePx + 0.5,
            height: tilePx + 0.5,
          }}
          onLoad={() => setLanded((n) => n + 1)}
          onError={() => setFailed((n) => n + 1)}
          accessibilityIgnoresInvertColors
        />
      ))}

      {/* The hole: rings, line to the flag, shots, you. */}
      {width > 0 && (
        <Svg width={width} height={height} style={{ position: 'absolute' }} pointerEvents="none">
          <Defs>
            <RadialGradient id="meGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.info} stopOpacity={0.35} />
              <Stop offset="1" stopColor={colors.info} stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* Distance rings from where you are. */}
          {RINGS.map((r) => {
            const px = fromUnits(r, units) / mpp;
            if (px < 24 || px > Math.hypot(width, height)) return null;
            return (
              <G key={r}>
                <Circle
                  cx={me.x}
                  cy={me.y}
                  r={px}
                  fill="none"
                  stroke="hsla(0, 0%, 100%, 0.35)"
                  strokeWidth={1}
                  strokeDasharray="4 6"
                />
                <SvgText
                  x={me.x}
                  y={me.y - px - 4}
                  fill="hsla(0, 0%, 100%, 0.75)"
                  fontSize={11}
                  fontFamily="Manrope_600SemiBold"
                  textAnchor="middle"
                >
                  {r}
                </SvgText>
              </G>
            );
          })}

          {/* Other holes' flags, faint, so you can find your way. */}
          {Object.entries(live.flags).map(([h, point]) => {
            if (Number(h) === hole) return null;
            const p = toScreen(point);
            return (
              <G key={h} opacity={0.55}>
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={9}
                  fill="hsla(0, 0%, 0%, 0.55)"
                  stroke="white"
                  strokeWidth={1}
                />
                <SvgText
                  x={p.x}
                  y={p.y + 3.5}
                  fill="white"
                  fontSize={10}
                  fontFamily="Manrope_700Bold"
                  textAnchor="middle"
                >
                  {h}
                </SvgText>
              </G>
            );
          })}

          {/* Shots pinned on this hole, joined in order. */}
          {pinShots.map(({ pin, at, fromPrev }, i) => {
            const prev = i > 0 ? pinShots[i - 1].at : null;
            return (
              <G key={pin.id}>
                {prev && (
                  <>
                    <Line
                      x1={prev.x}
                      y1={prev.y}
                      x2={at.x}
                      y2={at.y}
                      stroke="hsla(0, 0%, 100%, 0.85)"
                      strokeWidth={2}
                    />
                    {fromPrev !== null && (
                      <SvgText
                        x={(prev.x + at.x) / 2}
                        y={(prev.y + at.y) / 2 - 6}
                        fill="white"
                        fontSize={11}
                        fontFamily="Manrope_600SemiBold"
                        textAnchor="middle"
                      >
                        {formatDistance(fromPrev, units)}
                      </SvgText>
                    )}
                  </>
                )}
                <Circle
                  cx={at.x}
                  cy={at.y}
                  r={7}
                  fill="white"
                  stroke={GLOBE_COLORS.pin}
                  strokeWidth={2.5}
                />
                <SvgText
                  x={at.x}
                  y={at.y + 3}
                  fill={colors.background}
                  fontSize={9}
                  fontFamily="Manrope_700Bold"
                  textAnchor="middle"
                >
                  {i + 1}
                </SvgText>
              </G>
            );
          })}

          {/* From you to the flag. */}
          {flagPt && (
            <>
              <Line
                x1={me.x}
                y1={me.y}
                x2={flagPt.x}
                y2={flagPt.y}
                stroke="hsla(0, 0%, 100%, 0.9)"
                strokeWidth={1.5}
                strokeDasharray="6 5"
              />
              <G>
                <Line
                  x1={flagPt.x}
                  y1={flagPt.y}
                  x2={flagPt.x}
                  y2={flagPt.y - 26}
                  stroke="white"
                  strokeWidth={2}
                />
                <Path
                  d={`M ${flagPt.x} ${flagPt.y - 26} l 16 5 l -16 5 z`}
                  fill={colors.destructive}
                />
                <Circle cx={flagPt.x} cy={flagPt.y} r={4} fill="white" />
                <Circle
                  cx={flagPt.x}
                  cy={flagPt.y}
                  r={12}
                  fill="none"
                  stroke="hsla(0, 0%, 100%, 0.5)"
                  strokeWidth={1}
                />
              </G>
            </>
          )}

          {/* You. */}
          {fix && (
            <>
              {fix.accuracy !== undefined && fix.accuracy / mpp > 10 && (
                <Circle
                  cx={me.x}
                  cy={me.y}
                  r={fix.accuracy / mpp}
                  fill={colors.info}
                  fillOpacity={0.12}
                  stroke={colors.info}
                  strokeOpacity={0.3}
                />
              )}
              <Circle cx={me.x} cy={me.y} r={22} fill="url(#meGlow)" />
              {fix.heading !== undefined && (
                <Path
                  d={`M ${me.x} ${me.y - 20} l 7 10 l -14 0 z`}
                  fill={colors.info}
                  transform={`rotate(${fix.heading} ${me.x} ${me.y})`}
                />
              )}
              <Circle
                cx={me.x}
                cy={me.y}
                r={7}
                fill={colors.info}
                stroke="white"
                strokeWidth={2.5}
              />
            </>
          )}
          {!fix && origin.source === 'map' && (
            // No fix: distances come from the crosshair at the centre.
            <G opacity={0.9}>
              <Line
                x1={me.x - 14}
                x2={me.x - 5}
                y1={me.y}
                y2={me.y}
                stroke="white"
                strokeWidth={1.5}
              />
              <Line
                x1={me.x + 5}
                x2={me.x + 14}
                y1={me.y}
                y2={me.y}
                stroke="white"
                strokeWidth={1.5}
              />
              <Line
                y1={me.y - 14}
                y2={me.y - 5}
                x1={me.x}
                x2={me.x}
                stroke="white"
                strokeWidth={1.5}
              />
              <Line
                y1={me.y + 5}
                y2={me.y + 14}
                x1={me.x}
                x2={me.x}
                stroke="white"
                strokeWidth={1.5}
              />
            </G>
          )}
        </Svg>
      )}

      {/* Readout: distance to the flag, wind on the shot. */}
      <View pointerEvents="box-none" className="absolute inset-x-4" style={{ top: topSpace + 8 }}>
        <View className="flex-row items-start justify-between gap-2">
          <View
            className="rounded-2xl px-4 py-3"
            style={{
              backgroundColor: GLOBE_COLORS.callout,
              borderWidth: 1,
              borderColor: GLOBE_COLORS.calloutEdge,
            }}
          >
            {toFlagM !== null ? (
              <>
                <Text className="font-bold text-3xl leading-9 text-foreground">
                  {Math.round(toUnits(toFlagM, units))}
                  <Text className="font-semibold text-base text-muted-foreground"> {units}</Text>
                </Text>
                <Text className="text-xs text-muted-foreground">
                  to the flag
                  {origin.source === 'gps'
                    ? ''
                    : origin.source === 'pin'
                      ? ' from your last pin'
                      : ' from the map centre'}
                </Text>
                {windRead && (
                  <Text className="mt-1 text-xs text-primary-bright">Wind: {windRead}</Text>
                )}
              </>
            ) : (
              <>
                <Text className="font-semibold text-sm text-foreground">
                  Hole {hole}: no flag yet
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Mark the flag to see your distance.
                </Text>
              </>
            )}
            {lastShot !== null && lastShot > 5 && (
              <Text className="mt-1 text-xs text-muted-foreground">
                Last shot {formatDistance(lastShot, units)}
              </Text>
            )}
          </View>
          <WindChip wind={wind} />
        </View>
      </View>

      {/* Map controls. */}
      <View
        pointerEvents="box-none"
        className="absolute right-4 gap-2"
        style={{ top: topSpace + 112 }}
      >
        <RoundButton icon="locate" label="Centre on me" active={following} onPress={recentre} />
        <RoundButton
          icon="add"
          label="Zoom in"
          onPress={() => zoomAt(camera.zoom + 1, width / 2, height / 2)}
        />
        <RoundButton
          icon="remove"
          label="Zoom out"
          onPress={() => zoomAt(camera.zoom - 1, width / 2, height / 2)}
        />
        <Pressable
          className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
          style={{
            backgroundColor: GLOBE_COLORS.callout,
            borderWidth: 1,
            borderColor: GLOBE_COLORS.calloutEdge,
          }}
          onPress={() => updateLiveRound({ units: units === 'yd' ? 'm' : 'yd' })}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${units === 'yd' ? 'metres' : 'yards'}`}
        >
          <Text className="font-bold text-xs text-foreground">{units}</Text>
        </Pressable>
      </View>

      {/* Actions. */}
      <View
        pointerEvents="box-none"
        className="absolute inset-x-4 gap-2"
        style={{ bottom: bottomSpace }}
      >
        {note && (
          <View className="self-center rounded-full bg-elevated px-3 py-2">
            <Text className="text-xs text-foreground">{note}</Text>
          </View>
        )}
        {placingFlag && (
          <View className="self-center rounded-full bg-primary px-3 py-2">
            <Text className="text-xs text-primary-foreground">
              Tap the green to place the flag for hole {hole}
            </Text>
          </View>
        )}
        {blocked && (
          <View className="self-center rounded-full bg-elevated px-3 py-2">
            <Text className="text-xs text-muted-foreground">Satellite tiles blocked here</Text>
          </View>
        )}
        <View className="flex-row gap-2">
          <Pressable
            className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-primary py-3 active:opacity-80"
            onPress={pinHere}
            accessibilityRole="button"
            accessibilityLabel="Pin where I am"
          >
            <Ionicons name="pin" size={16} color={colors.primaryForeground} />
            <Text className="font-semibold text-sm text-primary-foreground">Pin where I am</Text>
          </Pressable>
          <Pressable
            className="flex-1 flex-row items-center justify-center gap-2 rounded-full py-3 active:opacity-80"
            style={{
              backgroundColor: placingFlag ? colors.foreground : GLOBE_COLORS.callout,
              borderWidth: 1,
              borderColor: GLOBE_COLORS.calloutEdge,
            }}
            onPress={() => setPlacingFlag((on) => !on)}
            accessibilityRole="button"
            accessibilityLabel={flag ? 'Move the flag' : 'Mark the flag'}
          >
            <Ionicons
              name="flag"
              size={16}
              color={placingFlag ? colors.background : colors.foreground}
            />
            <Text
              className="font-semibold text-sm"
              style={{ color: placingFlag ? colors.background : colors.foreground }}
            >
              {placingFlag ? 'Cancel' : flag ? 'Move flag' : 'Mark flag'}
            </Text>
          </Pressable>
          {holePins.length > 0 && (
            <Pressable
              className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
              style={{
                backgroundColor: GLOBE_COLORS.callout,
                borderWidth: 1,
                borderColor: GLOBE_COLORS.calloutEdge,
              }}
              onPress={() => removeLivePin(holePins[holePins.length - 1].id)}
              accessibilityRole="button"
              accessibilityLabel="Remove last pin"
            >
              <Ionicons name="arrow-undo-outline" size={18} color={colors.foreground} />
            </Pressable>
          )}
        </View>
        <Text className="self-end text-[10px] text-muted-foreground">
          {COURSE_IMAGERY.attribution}
        </Text>
      </View>
    </View>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
      style={{
        backgroundColor: active ? colors.primary : GLOBE_COLORS.callout,
        borderWidth: 1,
        borderColor: GLOBE_COLORS.calloutEdge,
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={active ? colors.primaryBright : colors.foreground} />
    </Pressable>
  );
}

/** Wind as an arrow pointing the way it blows, with speed and where it's from. */
export function WindChip({ wind }: { wind: WindState }) {
  return (
    <View
      className="flex-row items-center gap-2 rounded-2xl px-3 py-2"
      style={{
        backgroundColor: GLOBE_COLORS.callout,
        borderWidth: 1,
        borderColor: GLOBE_COLORS.calloutEdge,
      }}
      accessibilityLabel={
        wind.kind === 'ready'
          ? `Wind ${Math.round(wind.wind.speed)} miles per hour from ${compass(wind.wind.fromDeg)}`
          : 'Wind unavailable'
      }
    >
      {wind.kind === 'ready' ? (
        <>
          <View style={{ transform: [{ rotate: `${(wind.wind.fromDeg + 180) % 360}deg` }] }}>
            <Ionicons name="arrow-up" size={18} color={colors.primaryBright} />
          </View>
          <View>
            <Text className="font-bold text-sm leading-4 text-foreground">
              {Math.round(wind.wind.speed)}
              <Text className="font-semibold text-[10px] text-muted-foreground"> mph</Text>
            </Text>
            <Text className="text-[10px] text-muted-foreground">
              from {compass(wind.wind.fromDeg)}
              {wind.wind.gusts >= wind.wind.speed + 5
                ? ` · gusts ${Math.round(wind.wind.gusts)}`
                : ''}
            </Text>
          </View>
        </>
      ) : (
        <>
          <Ionicons name="flag-outline" size={16} color={colors.mutedForeground} />
          <Text className="text-xs text-muted-foreground">
            {wind.kind === 'loading' ? 'Wind…' : 'Wind unavailable'}
          </Text>
        </>
      )}
    </View>
  );
}

function compass(bearing: number): string {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}
