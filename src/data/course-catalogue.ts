import COURSE_ROWS from '@/data/courses.json';
import { popularityForType } from '@/lib/popularity';
import { Continent, Course } from '@/models/types';

/**
 * The bundled course catalogue, built by scripts/build-catalogue.mjs and
 * extended by scripts/import-osm-courses.mjs.
 *
 * Rows are arrays rather than objects to keep the bundle small, and are
 * hydrated into Course objects only when a screen needs one. The catalogue is
 * static, so it never goes into the persisted store — only the user's own
 * custom courses do.
 */

// [id, name, lat, lng, city, region, country, continent, holes, par, type, holeParDigits]
type Row = [
  string,
  string,
  number,
  number,
  string,
  string,
  string,
  string,
  number,
  number,
  string,
  string,
];

const ROWS = COURSE_ROWS as Row[];

export const CATALOGUE_COUNT = ROWS.length;

function parseHolePars(digits: string, holes: number): (number | undefined)[] | undefined {
  if (!digits) return undefined;
  // A 0 marks a hole the source has no par for. Keep it as a gap rather than
  // dropping it, or every later hole would shift onto the wrong par.
  const pars = Array.from({ length: holes }, (_, i) => {
    const n = Number(digits[i]);
    return n >= 3 && n <= 6 ? n : undefined;
  });
  return pars.some((n) => n !== undefined) ? pars : undefined;
}

function hydrate(row: Row): Course {
  const [
    id,
    name,
    latitude,
    longitude,
    city,
    region,
    country,
    continent,
    holes,
    par,
    type,
    parDigits,
  ] = row;
  return {
    id,
    name,
    city,
    region,
    country,
    continent: continent as Continent,
    coordinate: { latitude, longitude },
    par,
    holes,
    type,
    holePars: parseHolePars(parDigits, holes),
    popularity: popularityForType(type, holes),
  };
}

let byId: Map<string, number> | null = null;
function index(): Map<string, number> {
  if (!byId) {
    byId = new Map();
    for (let i = 0; i < ROWS.length; i++) byId.set(ROWS[i][0], i);
  }
  return byId;
}

export function findCatalogueCourse(id: string): Course | undefined {
  const i = index().get(id);
  return i === undefined ? undefined : hydrate(ROWS[i]);
}

/**
 * Name and city search. Courses outside the US are ranked first: the US set is
 * far larger, so without this a search for "Royal" would never surface
 * anything else.
 */
export function searchCatalogue(query: string, limit = 25): Course[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return ROWS.filter((r) => r[6] !== 'United States of America')
      .slice(0, limit)
      .map(hydrate);
  }

  const local: Row[] = [];
  const us: Row[] = [];
  for (const row of ROWS) {
    if (row[1].toLowerCase().includes(q) || row[4].toLowerCase().includes(q)) {
      (row[6] === 'United States of America' ? us : local).push(row);
      if (local.length >= limit) break;
    }
  }
  return [...local, ...us].slice(0, limit).map(hydrate);
}

/** Every course position, for plotting the globe. Cheap: numbers only. */
export type CoursePoint = { latitude: number; longitude: number };

let points: CoursePoint[] | null = null;
export function cataloguePoints(): CoursePoint[] {
  if (!points) points = ROWS.map((r) => ({ latitude: r[2], longitude: r[3] }));
  return points;
}

/** Courses per continent across the whole catalogue. */
let byContinent: Record<Continent, number> | null = null;
export function catalogueByContinent(): Record<Continent, number> {
  if (!byContinent) {
    const counts: Record<Continent, number> = {
      'North America': 0,
      'South America': 0,
      Europe: 0,
      Africa: 0,
      Asia: 0,
      Australia: 0,
    };
    for (const r of ROWS) {
      const c = r[7] as Continent;
      if (c in counts) counts[c] += 1;
    }
    byContinent = counts;
  }
  return byContinent;
}

/** Countries represented in the catalogue, with counts, most courses first. */
export function catalogueByCountry(): { country: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of ROWS) counts.set(r[6], (counts.get(r[6]) ?? 0) + 1);
  return [...counts.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);
}

/** Regions the Explore tab can browse. */
export type ExploreRegion =
  'featured' | 'uk-ireland' | 'europe' | 'usa' | 'asia-pacific' | 'americas' | 'africa';

export const EXPLORE_REGIONS: { id: ExploreRegion; label: string }[] = [
  { id: 'featured', label: 'Bucket list' },
  { id: 'uk-ireland', label: 'UK & Ireland' },
  { id: 'europe', label: 'Europe' },
  { id: 'usa', label: 'USA' },
  { id: 'asia-pacific', label: 'Asia-Pacific' },
  { id: 'americas', label: 'Americas' },
  { id: 'africa', label: 'Africa & Middle East' },
];

const UK_IRELAND = new Set(['Scotland', 'England', 'Wales', 'Northern Ireland', 'Ireland']);
const MIDDLE_EAST = new Set(['United Arab Emirates', 'Qatar', 'Bahrain', 'Oman', 'Saudi Arabia']);
const USA = 'United States of America';

function inRegion(row: Row, region: ExploreRegion): boolean {
  const country = row[6];
  const continent = row[7];
  switch (region) {
    case 'featured':
      // The hand-picked international seeds: the courses people travel for.
      return row[0].startsWith('intl-');
    case 'uk-ireland':
      return UK_IRELAND.has(country);
    case 'europe':
      return continent === 'Europe' && !UK_IRELAND.has(country);
    case 'usa':
      return country === USA;
    case 'asia-pacific':
      return (continent === 'Asia' && !MIDDLE_EAST.has(country)) || continent === 'Australia';
    case 'americas':
      return (continent === 'North America' || continent === 'South America') && country !== USA;
    case 'africa':
      return continent === 'Africa' || MIDDLE_EAST.has(country);
  }
}

const regionCache = new Map<ExploreRegion, Row[]>();

/**
 * Courses in a region, rarest (most points) first. Bucket-list courses keep
 * their curated order.
 */
export function browseCatalogue(region: ExploreRegion, limit = 40): Course[] {
  let rows = regionCache.get(region);
  if (!rows) {
    rows = ROWS.filter((r) => inRegion(r, region));
    if (region !== 'featured') {
      const pop = new Map(rows.map((r) => [r[0], popularityForType(r[10], r[8])]));
      rows = [...rows].sort((a, b) => pop.get(a[0])! - pop.get(b[0])! || a[1].localeCompare(b[1]));
    }
    regionCache.set(region, rows);
  }
  return rows.slice(0, limit).map(hydrate);
}

/** Number of catalogue courses in a region. */
export function regionCount(region: ExploreRegion): number {
  browseCatalogue(region, 0);
  return regionCache.get(region)!.length;
}

/** Great-circle distance in kilometres. */
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type NearbyCourse = { course: Course; distanceKm: number };

/**
 * The closest catalogue courses to a position, nearest first. Scans every row
 * with a cheap latitude cut before the full distance, which keeps it to a few
 * milliseconds for the whole catalogue.
 */
export function nearestCatalogueCourses(
  latitude: number,
  longitude: number,
  limit = 5,
  withinKm = 25
): NearbyCourse[] {
  const latSpan = withinKm / 111;
  const hits: { i: number; d: number }[] = [];
  for (let i = 0; i < ROWS.length; i++) {
    const row = ROWS[i];
    if (Math.abs(row[2] - latitude) > latSpan) continue;
    const d = distanceKm(latitude, longitude, row[2], row[3]);
    if (d <= withinKm) hits.push({ i, d });
  }
  hits.sort((a, b) => a.d - b.d);
  return hits.slice(0, limit).map(({ i, d }) => ({ course: hydrate(ROWS[i]), distanceKm: d }));
}
