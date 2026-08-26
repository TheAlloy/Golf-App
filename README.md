# Golf App

A social golf logbook: mark the courses you've played on an interactive map,
log rounds with scores, photos, tags and playing partners — and earn more
points for courses fewer people have played.

This is **Phase 1 (MVP)** of a larger vision (in-round GPS, live course
conditions, bookings, 3D holes, equipment tracking). See
[docs/roadmap.md](docs/roadmap.md) for the full plan.

## What's in the MVP

- **Map tab** — world map of courses (seeded catalogue + your own pins).
  Played courses show green markers; long-press anywhere to add a course.
- **Rounds tab** — log a round with date, 9/18 holes, gross score/to-par,
  occasion, tags, notes, photos, and who you played with.
- **Friends tab** — manage playing partners (name + handicap) and see how
  many rounds you've played together.
- **Profile tab** — rarity points total, courses/rounds/countries stats,
  and your rarest tick.
- **Rarity points** — every course is worth `10 + (100 − popularity)` points
  on first play (repeat rounds earn 10%), so hidden gems are worth ~7× more
  than St Andrews.

## Tech stack

- **Expo SDK 57 / React Native 0.86** with **expo-router** (TypeScript)
- **react-native-maps** for the map (Apple/Google maps; web falls back to a list)
- **zustand + AsyncStorage** for local-first state — the app fully works offline
  with no account
- **Supabase** (planned backend): schema + row-level security in
  [`supabase/migrations`](supabase/migrations). The client in
  `src/lib/supabase.ts` activates when `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set.

Why this stack: one TypeScript codebase for iOS + Android (the in-round GPS
phase requires native), Expo Go for instant testing on a phone, and a
local-first store so the MVP needs zero infrastructure while the Supabase
schema keeps a clear path to accounts and social sync.

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with the Expo Go app (iOS/Android). The map tab needs a real
device or simulator; `npx expo start --web` works but shows a course list
instead of the map.

## Project layout

```
src/
  app/            expo-router screens
    (tabs)/       map (index), rounds, friends, profile
    log-round.tsx modal: log a round
    add-course.tsx modal: add a course from a map long-press
    course/[id].tsx course detail
  components/     course-map (native + web fallback), themed primitives
  data/           seeded course catalogue
  lib/            rarity points logic, supabase client
  models/         shared TypeScript types
  store/          zustand store (persisted to AsyncStorage)
supabase/
  migrations/     Postgres schema + RLS for the Phase 2 backend
docs/
  roadmap.md                 feature phases for the full vision
  course-data-providers.md   licensed course-data options for in-round GPS
```
