# Global Play

A social golf logbook built around a globe: spin the world, see every course
lit up by density, and light your own up as you play them. Log rounds with
scorecards, photos, tags and playing partners — and earn more points for
courses fewer people have played.

See [docs/roadmap.md](docs/roadmap.md) for the full plan.

## What's built

- **Four tabs** — Home, Explore, Achievements and Profile, in a floating
  bar with a **+** in the middle that logs a round from anywhere.
- **Globe** (Home) — an orthographic world globe (d3-geo + SVG) that
  starts dark and lights up only where you have played: each area you know
  glows further along a heat ramp the more courses you tick off there. Drag to
  spin, pinch (or trackpad-pinch in a browser) to zoom into the spot under your fingers, tap a glow to open the course.
- **Real course data** — 15,667 US courses from the
  [OpenGolfAPI](https://github.com/opengolfapi/data) open dataset, including
  hole-by-hole par and stroke index, plus 60 curated international courses.
  Full UK/European coverage is one command away — see
  [docs/course-catalogue.md](docs/course-catalogue.md).
- **Explore** — search the catalogue or browse by region (rarest first) and
  heart courses onto your wishlist.
- **Achievements** — points, levels, wishlist quests and tiered badges.
  A wishlisted course scores double the first time you play it after adding
  it (`src/lib/progression.ts`, `src/lib/wishlist.ts`).
- **Rounds** — log a final score, or go hole by hole with strokes, putts and
  fairways. Greens in regulation are calculated, not asked for. Also date,
  9/18 holes, occasion, tags, notes, photos and playing partners.
- **Profile** — calculated handicap, shot quality (fairways, GIR, putts),
  recent rounds and friends.
- **Handicap** — derived from your rounds using the World Handicap System's
  method (best 8 of the last 20), with score-against-par standing in for the
  licensed course rating and slope.
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

## Course data

The bundled catalogue is US-complete but thin elsewhere, because no open
dataset covers the UK or Europe. OpenStreetMap does, so there is an importer:

```bash
npm run catalogue:import -- --region=uk
npm run catalogue:import -- --region=europe
npm run catalogue:import -- --region=world
```

It merges into `src/data/courses.json` without disturbing what is already
there. Full detail, including why every other source falls short, is in
[docs/course-catalogue.md](docs/course-catalogue.md).

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
    (tabs)/       bottom-tab screens
      index.tsx     Home: the globe
      explore.tsx   course search, regions, wishlist
      achievements.tsx  points, levels, quests, badges
      profile.tsx   handicap, shot quality, rounds, friends
    log-round.tsx modal: final score or hole by hole
    round/[id]    round detail with scorecard grid
    course/[id]   course detail
  components/     globe, tab bar, course card, scorecard entry, ui primitives
  data/           courses.json — the generated course catalogue
  lib/            points, progression, wishlist, stats, handicap, heat binning
  store/          zustand store (only user data is persisted)
scripts/               catalogue build + OpenStreetMap importer
supabase/migrations/   Postgres schema + RLS for the backend
docs/                  roadmap, catalogue guide, provider research
```

## Data attribution

US course data comes from the [OpenGolfAPI](https://github.com/opengolfapi/data)
open dataset, which is derived from OpenStreetMap and licensed under the
[Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
Country outlines on the globe come from
[world-atlas](https://github.com/topojson/world-atlas) (Natural Earth, public domain).

If you redistribute this app's data, ODbL requires you to attribute the source
and share any modified database under the same licence.
