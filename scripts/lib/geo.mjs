import { geoContains } from 'd3-geo';
import { createRequire } from 'node:module';
import * as topojson from 'topojson-client';

const require = createRequire(import.meta.url);

/**
 * Offline country lookup. Course coordinates are matched against Natural Earth
 * country polygons rather than a geocoding service, so imports need no API key
 * and no extra network round-trips.
 */
const topo = require('world-atlas/countries-50m.json');
const COUNTRIES = topojson.feature(topo, topo.objects.countries).features;

// Coarse bounding boxes speed up the point-in-polygon scan enormously: most
// countries are ruled out with four numeric comparisons.
const BOXES = COUNTRIES.map((f) => {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  const walk = (coords) => {
    if (typeof coords[0] === 'number') {
      const [x, y] = coords;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      return;
    }
    for (const c of coords) walk(c);
  };
  walk(f.geometry.coordinates);
  return { minX, minY, maxX, maxY };
});

function containing(lng, lat) {
  for (let i = 0; i < COUNTRIES.length; i++) {
    const b = BOXES[i];
    if (lng < b.minX || lng > b.maxX || lat < b.minY || lat > b.maxY) continue;
    if (geoContains(COUNTRIES[i], [lng, lat])) return COUNTRIES[i].properties.name;
  }
  return '';
}

// Coastlines are generalised at this resolution, so a seaside links can sit
// just outside its own country's polygon. When a point misses, nudge inland a
// little in each direction and take the first country that claims it.
const NUDGES = [0.05, 0.12, 0.25];

export function countryAt(lng, lat) {
  const direct = containing(lng, lat);
  if (direct) return direct;

  for (const d of NUDGES) {
    for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, -d], [d, -d], [-d, d]]) {
      const hit = containing(lng + dx, lat + dy);
      if (hit) return hit;
    }
  }
  return '';
}

/**
 * Country -> continent. Keyed by the Natural Earth country names used above.
 * Anything unlisted falls back to a longitude/latitude guess so a course is
 * never dropped just because its country is missing from this table.
 */
const CONTINENTS = {
  Europe: [
    'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herz.', 'Bulgaria',
    'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany',
    'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo', 'Latvia', 'Liechtenstein',
    'Lithuania', 'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands',
    'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino',
    'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Ukraine',
    'United Kingdom', 'Vatican',
  ],
  'North America': [
    'Antigua and Barb.', 'Bahamas', 'Barbados', 'Belize', 'Bermuda', 'Canada', 'Costa Rica',
    'Cuba', 'Dominica', 'Dominican Rep.', 'El Salvador', 'Greenland', 'Grenada', 'Guatemala',
    'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua', 'Panama', 'Puerto Rico',
    'St. Kitts and Nevis', 'St. Lucia', 'St. Vin. and Gren.', 'Trinidad and Tobago',
    'United States of America',
  ],
  'South America': [
    'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Falkland Is.',
    'Guyana', 'Paraguay', 'Peru', 'Suriname', 'Uruguay', 'Venezuela',
  ],
  Africa: [
    'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon',
    'Cape Verde', 'Central African Rep.', 'Chad', 'Comoros', 'Congo', 'Côte d’Ivoire',
    "Côte d'Ivoire", 'Dem. Rep. Congo', 'Djibouti', 'Egypt', 'Eq. Guinea', 'Eritrea',
    'eSwatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Kenya',
    'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius',
    'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'Senegal', 'Seychelles',
    'Sierra Leone', 'Somalia', 'Somaliland', 'South Africa', 'S. Sudan', 'Sudan', 'Tanzania',
    'Togo', 'Tunisia', 'Uganda', 'W. Sahara', 'Zambia', 'Zimbabwe',
  ],
  Asia: [
    'Afghanistan', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Bhutan', 'Brunei',
    'Cambodia', 'China', 'Georgia', 'Hong Kong', 'India', 'Indonesia', 'Iran', 'Iraq',
    'Israel', 'Japan', 'Jordan', 'Kazakhstan', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Lebanon',
    'Malaysia', 'Maldives', 'Mongolia', 'Myanmar', 'Nepal', 'North Korea', 'Oman', 'Pakistan',
    'Palestine', 'Philippines', 'Qatar', 'Saudi Arabia', 'Singapore', 'South Korea',
    'Sri Lanka', 'Syria', 'Taiwan', 'Tajikistan', 'Thailand', 'Timor-Leste', 'Turkey',
    'Turkmenistan', 'United Arab Emirates', 'Uzbekistan', 'Vietnam', 'Yemen',
  ],
  Australia: [
    'Australia', 'Fiji', 'New Caledonia', 'New Zealand', 'Papua New Guinea', 'Samoa',
    'Solomon Is.', 'Vanuatu',
  ],
};

const COUNTRY_TO_CONTINENT = new Map();
for (const [continent, countries] of Object.entries(CONTINENTS)) {
  for (const c of countries) COUNTRY_TO_CONTINENT.set(c, continent);
}

export const CONTINENT_ORDER = [
  'North America',
  'South America',
  'Europe',
  'Africa',
  'Asia',
  'Australia',
];

export function continentFor(countryName, lng, lat) {
  const known = COUNTRY_TO_CONTINENT.get(countryName);
  if (known) return known;
  // Fallback by position, so an unmapped country still lands somewhere sane.
  if (lat < -10 && lng > 110) return 'Australia';
  if (lng >= 25 && lat >= 5) return 'Asia';
  if (lng >= -25 && lng < 60 && lat < 38) return 'Africa';
  if (lng >= -30 && lng < 45 && lat >= 34) return 'Europe';
  if (lat < 13 && lng < -30) return 'South America';
  return 'North America';
}
