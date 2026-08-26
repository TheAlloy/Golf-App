# Golf course data providers

The MVP ships with a small seeded course catalogue plus user-added pins, so it
needs no licensed data. The moment we build **in-round GPS** (distances to
greens/hazards, hole maps, 3D flyovers), we need licensed hole-level geometry —
that data is surveyed and owned by commercial providers; there is no good free
source.

## Options

| Provider | What you get | Rough cost | Notes |
| --- | --- | --- | --- |
| [iGolf](https://igolf.com/solutions/golf-course-data/) | Industry-standard vector course maps: tee boxes, front/centre/back greens, hazards, custom points. API (iGolf Connect) or embedded data. | Custom licensing, typically per-active-user/device fees. Enterprise-oriented. | Powers many big GPS apps and watch OEMs. The "safe" choice once we have revenue. |
| [Golf Intelligence](https://golfintelligence.com/) | Course + GPS + 3D green slope data, claims every hole in the world, scoring records. | Free trial credits, then from ~$399/month. | Newer player, aggressive on coverage; good mid-tier option. |
| [SportsFirst Golf API](https://www.sportsfirst.net/sportsapi/golf-course-api) | Course details, tees, yardage, par, slope/rating, coordinates. | Tiered API pricing. | Good for course *metadata*, thinner on hole geometry. |
| [GolfAPI.io](https://golfapi.io/) | ~42k courses, club/course search, hole-by-hole coordinates. | Pay-per-call tiers, hobby-friendly. | Cheapest way to prototype real hole GPS. |
| OpenStreetMap (free) | Course locations/boundaries, sometimes fairways/greens tagged by volunteers. | Free (ODbL). | Fine for the discovery map + pins. Coverage of hole geometry is patchy and unreliable — not good enough for distances. |

## Recommendation

1. **Now (MVP)**: seeded catalogue + user pins + (optionally) an OSM import of
   course names/locations for the user's country. Zero cost, no lock-in.
2. **Phase 2 prototype (in-round GPS)**: start on **GolfAPI.io** to validate
   the in-round experience cheaply on a handful of courses.
3. **Scale / production GPS**: negotiate **iGolf** (best coverage + accuracy,
   used by the apps we're benchmarking against) or **Golf Intelligence** if
   its 3D green data proves out — that also unlocks the "view holes in 3D"
   feature without us surveying anything.

Weather/wind overlays are separate and cheap: Open-Meteo (free) or
OpenWeatherMap for wind speed/direction at the course, combined with hole
bearing to compute adjusted playing distances.

Sources: [Golf Intelligence API guide](https://golfintelligence.com/best-golf-apis-for-developers-a-complete-guide-to-golf-course-data-apis/), [Golf Intelligence pricing](https://golfintelligence.com/api-pricing/), [iGolf course data](https://igolf.com/solutions/golf-course-data/), [SportsFirst mapping API explainer](https://www.sportsfirst.net/post/golf-course-mapping-api-explained-yardages-hole-layouts-gps-precision), [GolfAPI.io](https://golfapi.io/)
