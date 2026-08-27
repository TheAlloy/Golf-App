# The course catalogue

`src/data/courses.json` is the bundled list of every course the app knows
about. It is generated, not hand-edited.

Each row is an array rather than an object, which keeps the bundle roughly a
third smaller:

```
[id, name, lat, lng, city, region, country, continent, holes, par, type, holeParDigits]
```

`holeParDigits` is one digit per hole (`"445344353..."`), empty when the source
has no scorecard.

## Where the data comes from

| Source | Coverage | Has hole pars | Licence |
| --- | --- | --- | --- |
| [OpenGolfAPI](https://github.com/opengolfapi/data) | **US only** — 15,667 courses | Yes, ~90% | ODbL 1.0 |
| `scripts/seeds/international-courses.json` | 60 curated notable courses | No | Hand-written |
| OpenStreetMap via Overpass | **Worldwide**, anything mapped | No | ODbL 1.0 |

There is no ready-made open dataset for the UK or Europe. Every candidate is
North America only:

- OpenGolfAPI's published files are US-only (its worldwide figure refers to
  the hosted API, not the downloadable dataset)
- [GeoJSON-GolfCourses](https://github.com/TheMapSmith/GeoJSON-GolfCourses)
  is North America, with Europe listed as "coming soon"

OpenStreetMap is the source that does have worldwide coverage — it is what
OpenGolfAPI derived its US data from in the first place — so the way to get
every UK and European course is to pull them from OSM directly.

## Getting full UK / European coverage

```bash
npm run catalogue:import -- --region=uk
npm run catalogue:import -- --region=ireland
npm run catalogue:import -- --region=europe
```

Other regions: `north-america`, `south-america`, `africa`, `asia`, `oceania`,
and `world` for everything at once.

The importer:

- tiles the region and queries Overpass one tile at a time, with backoff and
  automatic failover between three public endpoints
- assigns country and continent offline by point-in-polygon against Natural
  Earth boundaries, so no geocoding API or key is needed
- **merges** into the existing catalogue rather than replacing it, skipping any
  course already present within ~400 m under a matching name — so the richer US
  records with hole-by-hole par are never overwritten by a thinner OSM one
- takes a while: Overpass is a free shared service and the script deliberately
  paces itself. `--region=europe` is roughly 200 tiles.

Useful flags:

```bash
--dry-run                      # fetch and report, write nothing
--tile=4                       # smaller tiles if queries time out
OVERPASS_URL=http://localhost:12345/api/interpreter   # a self-hosted instance
```

Commit the regenerated `src/data/courses.json` when you are happy with it.

## Rebuilding from scratch

```bash
npm run catalogue:build
```

Downloads the OpenGolfAPI US dataset and combines it with the curated seeds.
This **overwrites** `courses.json`, so re-run any OSM imports afterwards.

## Bundle size

The US-only catalogue is about 2.4 MB of JSON. A worldwide OSM import adds
roughly 25,000 more courses and takes it to somewhere near 6 MB. That is still
fine to bundle, but if it becomes a problem the natural next step is to ship
only the user's region and fetch the rest on demand from the backend.

## Attribution

Both OpenGolfAPI and OpenStreetMap are ODbL 1.0. If you redistribute this data
you must attribute the source and share any modified database under the same
licence. The in-app attribution lives on the Profile → Course coverage screen.
