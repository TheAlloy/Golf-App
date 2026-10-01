import { geoBounds, geoCircle, geoContains } from 'd3-geo';
import * as topojson from 'topojson-client';
import countries110m from 'world-atlas/countries-110m.json';

import countryContinents from '@/data/country-continents.json';
import { Continent, Course } from '@/models/types';

/**
 * "Where have I played" shading for the map. Each level turns the courses you
 * have played into areas to colour on the globe.
 *
 * Boundary data is bundled where it exists in a sensible size: countries for
 * the whole world (Natural Earth, via world-atlas), states and counties for
 * the US (Census Bureau, via us-atlas). Elsewhere a region or county becomes
 * a soft disc around the course, sized to roughly match.
 */
export type CoverageLevel = 'off' | 'cities' | 'counties' | 'regions' | 'countries' | 'continents';

export const COVERAGE_LEVELS: { id: CoverageLevel; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'cities', label: 'Cities' },
  { id: 'counties', label: 'Counties' },
  { id: 'regions', label: 'Regions' },
  { id: 'countries', label: 'Countries' },
  { id: 'continents', label: 'Continents' },
];

type Feature = GeoJSON.Feature;
type Bounds = [[number, number], [number, number]];

const COUNTRIES = topojson.feature(
  countries110m as never,
  (countries110m as never as { objects: { countries: never } }).objects.countries
) as unknown as GeoJSON.FeatureCollection;

const CONTINENT_BY_ID = countryContinents as Record<string, Continent>;

/** Disc radii in degrees of arc (1° ≈ 111 km). */
const CITY_RADIUS = 0.12;
const COUNTY_RADIUS = 0.35;
const REGION_RADIUS = 1.1;

// US boundary sets are parsed on first use; counties alone are 3,000 shapes.
let statesCache: GeoJSON.FeatureCollection | null = null;
let countiesCache: GeoJSON.FeatureCollection | null = null;
function usStates(): GeoJSON.FeatureCollection {
  if (!statesCache) {
    const topo = require('us-atlas/states-10m.json');
    statesCache = topojson.feature(
      topo,
      topo.objects.states
    ) as unknown as GeoJSON.FeatureCollection;
  }
  return statesCache;
}
function usCounties(): GeoJSON.FeatureCollection {
  if (!countiesCache) {
    const topo = require('us-atlas/counties-10m.json');
    countiesCache = topojson.feature(
      topo,
      topo.objects.counties
    ) as unknown as GeoJSON.FeatureCollection;
  }
  return countiesCache;
}

const boundsCache = new WeakMap<Feature, Bounds>();
function boundsOf(f: Feature): Bounds {
  let b = boundsCache.get(f);
  if (!b) {
    b = geoBounds(f as never) as Bounds;
    boundsCache.set(f, b);
  }
  return b;
}

function inBounds([lon, lat]: [number, number], b: Bounds): boolean {
  return lon >= b[0][0] && lon <= b[1][0] && lat >= b[0][1] && lat <= b[1][1];
}

/** The feature of a collection containing a point, with a bounds pre-check. */
function featureAt(collection: GeoJSON.FeatureCollection, point: [number, number]): Feature | null {
  for (const f of collection.features) {
    if (inBounds(point, boundsOf(f)) && geoContains(f as never, point)) return f;
  }
  return null;
}

const containingCountry = new Map<string, Feature | null>();
const containingState = new Map<string, Feature | null>();
const containingCounty = new Map<string, Feature | null>();

function lookup(
  cache: Map<string, Feature | null>,
  collection: () => GeoJSON.FeatureCollection,
  course: Course
): Feature | null {
  if (!cache.has(course.id)) {
    const { longitude, latitude } = course.coordinate;
    cache.set(course.id, featureAt(collection(), [longitude, latitude]));
  }
  return cache.get(course.id) ?? null;
}

function disc(course: Course, radius: number): Feature {
  const { longitude, latitude } = course.coordinate;
  return {
    type: 'Feature',
    properties: { id: course.id },
    geometry: geoCircle().center([longitude, latitude]).radius(radius)(),
  };
}

const isUS = (course: Course) => course.country === 'United States of America';

/**
 * Shapes to colour for a level. Shapes that several courses share (a country
 * played five times) appear once.
 */
export function coverageShapes(level: CoverageLevel, courses: Course[]): Feature[] {
  if (level === 'off' || courses.length === 0) return [];
  const unique = new Set<Feature>();
  const out: Feature[] = [];
  const add = (f: Feature | null) => {
    if (f && !unique.has(f)) {
      unique.add(f);
      out.push(f);
    }
  };

  switch (level) {
    case 'continents': {
      const played = new Set(courses.map((c) => c.continent));
      for (const f of COUNTRIES.features) {
        const continent = CONTINENT_BY_ID[String(f.id)];
        if (continent && played.has(continent)) add(f);
      }
      return out;
    }
    case 'countries':
      for (const c of courses) add(lookup(containingCountry, () => COUNTRIES, c));
      return out;
    case 'regions':
      for (const c of courses) {
        add(isUS(c) ? lookup(containingState, usStates, c) : disc(c, REGION_RADIUS));
      }
      return out;
    case 'counties':
      for (const c of courses) {
        add(isUS(c) ? lookup(containingCounty, usCounties, c) : disc(c, COUNTY_RADIUS));
      }
      return out;
    case 'cities':
      for (const c of courses) add(disc(c, CITY_RADIUS));
      return out;
  }
}

/** Whether a level is drawn from real boundaries everywhere, or discs outside the US. */
export function coverageNote(level: CoverageLevel): string | null {
  if (level === 'counties' || level === 'regions')
    return 'Outside the US, an area around each course';
  if (level === 'cities') return 'An area around each course';
  return null;
}
