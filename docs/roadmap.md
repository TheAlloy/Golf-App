# Roadmap

How the full vision maps onto build phases. Phase 1 is what's in this repo.

## Phase 1 — MVP: the map + logbook (this repo)

- [x] Interactive world map of courses; played courses marked in green
- [x] Long-press to add any course as a custom pin
- [x] Log rounds: date, 9/18 holes, gross score & to-par, occasion, tags, notes
- [x] Photos attached to rounds
- [x] Playing partners (locally managed friends list with handicaps)
- [x] Rarity points — more points for courses fewer people have played
- [x] Profile stats: courses, rounds, countries, rarest tick
- [x] Local-first persistence (AsyncStorage); Supabase schema ready for sync

## Phase 2 — Accounts & social

- Supabase auth (apply `supabase/migrations`), sync local data on first login
- Real friend requests; see friends' maps and rounds (RLS already written)
- Shared rounds: one player logs, partners get it on their timeline
- Points leaderboards among friends
- Popularity computed from real play data instead of seed estimates

## Phase 3 — In-round experience (Hole19 / 18Birdies territory)

- License hole-level geometry (see `docs/course-data-providers.md`)
- Course GPS view: distances to front/centre/back, hazards, layups
- Wind/weather-adjusted "plays like" distances (Open-Meteo + hole bearing)
- Live scorecards: stroke play, stableford, match play, skins; handicap-aware
- Digital scorecard linking (photo of paper card → attach to round)

## Phase 4 — Course conditions network

- Crowdsourced reports on leaving a round: greens/fairways/bunkers, buggy
  rules, pace of play (Waze model — works without club buy-in)
- Clubhouse portal for verified conditions: walk/carry/buggy status, facility
  availability (range, buggies, food), course closures
- Live weather per course

## Phase 5 — Bookings, 3D, equipment

- Tee-time booking via aggregator APIs (GolfNow/BRS) or per-club partnerships
- 3D hole flyovers (Mapbox 3D terrain + licensed hole geometry)
- Equipment lifecycle tracker: register clubs (scan/QR), auto-count rounds
  per club, replacement reminders for grips/gloves/balls, affiliate links

## Out of scope until there's traction

- Watch apps, shot tracing, AI caddie recommendations
