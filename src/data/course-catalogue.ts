import { INTERNATIONAL_COURSES } from '@/data/international-courses';
import US_ROWS from '@/data/us-courses.json';
import { popularityForType } from '@/lib/popularity';
import { Continent, Course } from '@/models/types';

/**
 * The bundled course catalogue: 15,667 US courses from the OpenGolfAPI open
 * dataset (ODbL) plus a curated international set.
 *
 * Rows are stored as arrays rather than objects to keep the bundle small, and
 * are hydrated into Course objects only when a screen actually needs one. The
 * catalogue is static, so it never goes into the persisted store — only the
 * user's own custom courses do.
 */

// [id, name, lat, lng, city, state, holes, par, type, holeParsDigits]
type UsRow = [string, string, number, number, string, string, number, number, string, string];

const ROWS = US_ROWS as UsRow[];

export const US_COURSE_COUNT = ROWS.length;
export const INTERNATIONAL_COURSE_COUNT = INTERNATIONAL_COURSES.length;
export const CATALOGUE_COUNT = US_COURSE_COUNT + INTERNATIONAL_COURSE_COUNT;

function parseHolePars(digits: string, holes: number): number[] | undefined {
  if (!digits) return undefined;
  const pars = digits.split('').map(Number).filter((n) => n > 0);
  return pars.length ? pars.slice(0, holes) : undefined;
}

function hydrateUs(row: UsRow): Course {
  const [id, name, latitude, longitude, city, region, holes, par, type, parDigits] = row;
  return {
    id,
    name,
    city,
    region,
    country: 'USA',
    continent: 'North America',
    coordinate: { latitude, longitude },
    par,
    holes,
    type,
    holePars: parseHolePars(parDigits, holes),
    popularity: popularityForType(type, holes),
  };
}

const INTERNATIONAL: Course[] = INTERNATIONAL_COURSES.map((c) => ({
  id: c.id,
  name: c.name,
  city: c.city,
  region: '',
  country: c.country,
  continent: c.continent,
  coordinate: { latitude: c.latitude, longitude: c.longitude },
  par: c.par,
  holes: c.holes,
  type: c.type,
  popularity: popularityForType(c.type, c.holes),
}));

// id -> row index for US courses; international courses are held hydrated
// already since there are only a few dozen.
let usIndex: Map<string, number> | null = null;
function getUsIndex(): Map<string, number> {
  if (!usIndex) {
    usIndex = new Map();
    for (let i = 0; i < ROWS.length; i++) usIndex.set(ROWS[i][0], i);
  }
  return usIndex;
}

const INTERNATIONAL_BY_ID = new Map(INTERNATIONAL.map((c) => [c.id, c]));

export function findCatalogueCourse(id: string): Course | undefined {
  const intl = INTERNATIONAL_BY_ID.get(id);
  if (intl) return intl;
  const i = getUsIndex().get(id);
  return i === undefined ? undefined : hydrateUs(ROWS[i]);
}

/** Name/city search across the whole catalogue, international results first. */
export function searchCatalogue(query: string, limit = 25): Course[] {
  const q = query.trim().toLowerCase();
  if (!q) return INTERNATIONAL.slice(0, limit);

  const results: Course[] = [];
  for (const c of INTERNATIONAL) {
    if (`${c.name} ${c.city} ${c.country}`.toLowerCase().includes(q)) results.push(c);
    if (results.length >= limit) return results;
  }
  for (const row of ROWS) {
    if (row[1].toLowerCase().includes(q) || row[4].toLowerCase().includes(q)) {
      results.push(hydrateUs(row));
      if (results.length >= limit) break;
    }
  }
  return results;
}

/** Every course position, for plotting the globe. Cheap: numbers only. */
export type CoursePoint = { latitude: number; longitude: number };

let points: CoursePoint[] | null = null;
export function cataloguePoints(): CoursePoint[] {
  if (!points) {
    points = ROWS.map((r) => ({ latitude: r[2], longitude: r[3] }));
    for (const c of INTERNATIONAL) points.push(c.coordinate);
  }
  return points;
}

export function continentOf(course: Course): Continent {
  return course.continent;
}

/** Courses per continent across the whole catalogue. */
export function catalogueByContinent(): Record<Continent, number> {
  const counts: Record<Continent, number> = {
    'North America': US_COURSE_COUNT,
    'South America': 0,
    Europe: 0,
    Africa: 0,
    Asia: 0,
    Australia: 0,
  };
  for (const c of INTERNATIONAL) counts[c.continent] += 1;
  return counts;
}

export { INTERNATIONAL as INTERNATIONAL_CATALOGUE };
