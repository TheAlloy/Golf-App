import { geoBounds, geoContains } from 'd3-geo';
import * as topojson from 'topojson-client';
import countries110m from 'world-atlas/countries-110m.json';

import countryContinents from '@/data/country-continents.json';
import { Continent, Course } from '@/models/types';

/**
 * "Where have I played" shading for the map. Each level turns the courses you
 * have played into areas to colour on the globe.
 *
 * Boundary data is bundled where it exists in a sensible size: countries for
 * the whole world (Natural Earth, via world-atlas) and states for the US
 * (Census Bureau, via us-atlas).
 */
export type CoverageLevel = 'off' | 'states' | 'countries';

export const COVERAGE_LEVELS: { id: CoverageLevel; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'states', label: 'US states' },
  { id: 'countries', label: 'Countries' },
];

type Feature = GeoJSON.Feature;

/** An area to shade, with the continent that picks its colour. */
export type CoverageShape = { feature: Feature; continent: Continent };
type Bounds = [[number, number], [number, number]];

const COUNTRIES = topojson.feature(
  countries110m as never,
  (countries110m as never as { objects: { countries: never } }).objects.countries
) as unknown as GeoJSON.FeatureCollection;

const CONTINENT_BY_ID = countryContinents as Record<string, Continent>;

// US states are parsed on first use.
let statesCache: GeoJSON.FeatureCollection | null = null;
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

const isUS = (course: Course) => course.country === 'United States of America';

/**
 * Shapes to colour for a level. Shapes that several courses share (a country
 * played five times) appear once.
 */
export function coverageShapes(level: CoverageLevel, courses: Course[]): CoverageShape[] {
  if (level === 'off' || courses.length === 0) return [];
  const unique = new Set<Feature>();
  const out: CoverageShape[] = [];
  const add = (f: Feature | null, continent: Continent) => {
    if (f && !unique.has(f)) {
      unique.add(f);
      out.push({ feature: f, continent });
    }
  };

  switch (level) {
    case 'countries':
      for (const c of courses) {
        const f = lookup(containingCountry, () => COUNTRIES, c);
        // The country's own continent, falling back to the course's.
        add(f, (f && CONTINENT_BY_ID[String(f.id)]) || c.continent);
      }
      return out;
    case 'states':
      for (const c of courses) {
        if (isUS(c)) add(lookup(containingState, usStates, c), 'North America');
      }
      return out;
  }
}

/** A caveat worth showing next to the picker for some levels. */
export function coverageNote(level: CoverageLevel): string | null {
  if (level === 'states') return 'US courses only';
  return null;
}
