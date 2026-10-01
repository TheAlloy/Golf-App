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
  starts dark and marks every course you have played in green and every
  wishlisted one in lime yellow. A thumbnail in the top right switches to a
  terrain view: NASA Blue Marble satellite imagery wrapped onto the sphere by a
  GPU shader (expo-gl), with country borders and pins drawn over it. On the
  dark map a "Played" filter shades where you have been, from cities up to
  continents: countries worldwide, states and counties in the US, and a soft
  area around each course where no boundary data is bundled. Drag to spin, pinch (or trackpad-pinch in a browser) to zoom smoothly into the spot under your fingers; close up, courses become flags with a name-and-status callout. Tap one to open the course.
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

### Satellite imagery

The terrain view wraps a bundled whole-earth texture onto the globe, then
sharpens it with streamed Web Mercator tiles as you zoom in. Out of the box it
streams EOX's Sentinel-2 cloudless mosaic (free with attribution, no key,
~10 m per pixel). For sharper imagery point it at another provider with
`EXPO_PUBLIC_*` variables (see `.env.example`):

| Provider | `EXPO_PUBLIC_IMAGERY_TILES` | Max zoom | Notes |
| --- | --- | --- | --- |
| EOX Sentinel-2 (default) | `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg` | 14 | Free, attribution required |
| Esri World Imagery | `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | 19 | Free tier needs an ArcGIS key for production |
| Mapbox Satellite | `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=…` | 22 | Set tile size 512 |
| MapTiler Satellite | `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=…` | 20 | |

Set `EXPO_PUBLIC_IMAGERY_MAX_ZOOM`, `EXPO_PUBLIC_IMAGERY_TILE_SIZE` (256 or
512) and `EXPO_PUBLIC_IMAGERY_ATTRIBUTION` to match, and show the provider's
attribution as its terms require (the app prints it over the globe). Set
`EXPO_PUBLIC_IMAGERY_TILES=off` to disable streaming and keep the bundled
texture only. Google's imagery is only available through Google's own Map
Tiles API, which needs a billed Cloud project and a session token flow this
app doesn't implement.

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
  lib/            points, progression, wishlist, stats, handicap
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
[world-atlas](https://github.com/topojson/world-atlas) (Natural Earth, public domain);
US state and county outlines from [us-atlas](https://github.com/topojson/us-atlas)
(US Census Bureau, public domain); the country-to-continent table in
`src/data/country-continents.json` is derived from
[world-countries](https://github.com/mledoze/countries) (ODbL).
The terrain view uses NASA's
[Blue Marble](https://visibleearth.nasa.gov/collection/1484/blue-marble) imagery
(public domain), bundled as `assets/earth/blue-marble.jpg`. Streamed tiles are
[Sentinel-2 cloudless](https://s2maps.eu) by [EOX IT Services GmbH](https://eox.at)
(contains modified Copernicus Sentinel data), unless configured otherwise.

If you redistribute this app's data, ODbL requires you to attribute the source
and share any modified database under the same licence.
