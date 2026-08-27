# Global Play

A social golf logbook built around a globe: spin the world, see every course
lit up by density, and light your own up as you play them. Log rounds with
scorecards, photos, tags and playing partners — and earn more points for
courses fewer people have played.

See [docs/roadmap.md](docs/roadmap.md) for the full plan.

## What's built

- **Globe** — an orthographic world globe (d3-geo + SVG) with 15,700+ courses
  drawn as a density heat map, your played courses picked out in the accent
  colour, per-continent counts, and drag-to-spin.
- **Real course data** — 15,667 US courses from the
  [OpenGolfAPI](https://github.com/opengolfapi/data) open dataset, including
  hole-by-hole par and stroke index, plus 60 curated international courses.
- **Rounds** — date, 9/18 holes, gross score and to-par, occasion, tags,
  notes, photos, and playing partners.
- **Scorecards** — optional hole-by-hole entry (strokes, putts, fairway, GIR)
  that feeds the stats screens. A filled card overrides the typed total.
- **Stats** — fairways hit, greens in regulation, putts per hole, best rounds.
- **Rarity points** — a course is worth `10 + (100 − popularity)` on first
  play, repeats 10%. Popularity is derived from access type until the app has
  real play counts to aggregate (see `src/lib/popularity.ts`).

## Tech stack

- **Expo SDK 57 / React Native 0.86** with **expo-router**, TypeScript
- **NativeWind 4** with shadcn-shaped tokens in `src/global.css` — the app is
  deliberately **dark-only**, a single palette with no light variant
- **d3-geo + react-native-svg + world-atlas** for the globe
- **zustand + AsyncStorage** for local-first state. Only your own data is
  persisted; the course catalogue is static and bundled
- **Supabase** (planned): schema and row-level security in
  [`supabase/migrations`](supabase/migrations)

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android). `npx expo start --web` works too —
the globe renders on web; only the course pin map is native-only.

## Project layout

```
src/
  app/            expo-router screens
    (tabs)/       home (globe), rounds, play, stats, profile
    log-round.tsx modal: log a round, with optional scorecard
    round/[id]    round detail with scorecard grid
    course/[id]   course detail
  components/     globe, scorecard entry, ui primitives
  data/           bundled course catalogue (US dataset + international)
  lib/            points, stats, heat binning, popularity, supabase
  store/          zustand store (only user data is persisted)
supabase/migrations/   Postgres schema + RLS for the backend
docs/                  roadmap and course-data provider research
```

## Data attribution

US course data comes from the [OpenGolfAPI](https://github.com/opengolfapi/data)
open dataset, which is derived from OpenStreetMap and licensed under the
[Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
Country outlines on the globe come from
[world-atlas](https://github.com/topojson/world-atlas) (Natural Earth, public domain).

If you redistribute this app's data, ODbL requires you to attribute the source
and share any modified database under the same licence.
