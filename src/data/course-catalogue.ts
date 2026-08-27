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
  string, string, number, number, string, string,
  string, string, number, number, string, string,
];

const ROWS = COURSE_ROWS as Row[];

export const CATALOGUE_COUNT = ROWS.length;

function parseHolePars(digits: string, holes: number): number[] | undefined {
  if (!digits) return undefined;
  const pars = digits.split('').map(Number).filter((n) => n > 0);
  return pars.length ? pars.slice(0, holes) : undefined;
}

function hydrate(row: Row): Course {
  const [id, name, latitude, longitude, city, region, country, continent, holes, par, type, parDigits] = row;
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
