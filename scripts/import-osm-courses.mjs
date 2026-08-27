#!/usr/bin/env node
/**
 * Import golf courses from OpenStreetMap into the app's bundled catalogue.
 *
 * OpenStreetMap is the only free source with worldwide coverage of
 * `leisure=golf_course`, and it is what the bundled US dataset was derived
 * from. This script pulls any region straight from Overpass and merges the
 * result into src/data/courses.json.
 *
 *   node scripts/import-osm-courses.mjs --region=uk
 *   node scripts/import-osm-courses.mjs --region=europe
 *   node scripts/import-osm-courses.mjs --region=world
 *   node scripts/import-osm-courses.mjs --region=uk,ireland --dry-run
 *
 * Existing courses are kept: a fetched course is skipped when one already sits
 * within ~400 m with a matching name, so the richer US records (which carry
 * hole-by-hole par) are never replaced by a thinner OSM one.
 *
 * Overpass is a shared free service. Requests are issued one tile at a time
 * with backoff; a worldwide import takes a while and that is expected.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { continentFor, countryAt } from './lib/geo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = process.env.COURSES_FILE || path.join(ROOT, 'src/data/courses.json');

// OVERPASS_URL overrides these, for a self-hosted instance or a test double.
const ENDPOINTS = process.env.OVERPASS_URL
  ? [process.env.OVERPASS_URL]
  : [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.osm.ch/api/interpreter',
    ];

/** [south, west, north, east] */
const REGIONS = {
  uk: [49.8, -8.7, 61.0, 2.0],
  ireland: [51.3, -10.7, 55.5, -5.9],
  europe: [34.0, -25.0, 71.5, 45.0],
  'north-america': [5.0, -170.0, 84.0, -50.0],
  'south-america': [-56.0, -82.0, 13.0, -34.0],
  africa: [-35.0, -26.0, 38.0, 52.0],
  asia: [-11.0, 25.0, 82.0, 180.0],
  oceania: [-50.0, 110.0, -5.0, 180.0],
};
REGIONS.world = [-56.0, -180.0, 84.0, 180.0];

/** Overpass struggles with huge bounding boxes, so each region is tiled. */
const TILE_DEGREES = 6;

function parseArgs(argv) {
  const args = { regions: ['uk'], dryRun: false, tile: TILE_DEGREES };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--region=')) args.regions = a.slice(9).split(',').map((r) => r.trim());
    else if (a === '--dry-run') args.dryRun = true;
    else if (a.startsWith('--tile=')) args.tile = Number(a.slice(7)) || TILE_DEGREES;
  }
  return args;
}

function tilesFor([s, w, n, e], step) {
  const tiles = [];
  for (let lat = s; lat < n; lat += step) {
    for (let lng = w; lng < e; lng += step) {
      tiles.push([lat, lng, Math.min(lat + step, n), Math.min(lng + step, e)]);
    }
  }
  return tiles;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(query, attempt = 0) {
  const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: query }),
    });
    if (res.status === 429 || res.status === 504) throw new Error(`busy (${res.status})`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (attempt >= 5) throw err;
    const wait = 2 ** attempt * 2000;
    console.warn(`  retry ${attempt + 1} after ${wait / 1000}s — ${err.message}`);
    await sleep(wait);
    return overpass(query, attempt + 1);
  }
}

function tileQuery([s, w, n, e]) {
  const bbox = `${s},${w},${n},${e}`;
  return `[out:json][timeout:180];
(
  node["leisure"="golf_course"](${bbox});
  way["leisure"="golf_course"](${bbox});
  relation["leisure"="golf_course"](${bbox});
);
out center tags;`;
}

/** Map OSM access/ownership tags onto the access types the app scores on. */
function courseType(tags) {
  const access = (tags.access || '').toLowerCase();
  if (access === 'private' || access === 'members') return 'Private';
  if (access === 'customers') return 'Semi-Private';
  if (tags.operator_type === 'public' || access === 'yes' || access === 'public') return 'Public';
  if (tags.golf === 'municipal' || /municipal|council/i.test(tags.operator || '')) return 'Municipal';
  if (/resort|hotel/i.test(`${tags.operator || ''} ${tags.name || ''}`)) return 'Resort';
  return '';
}

function holesOf(tags) {
  const raw = Number(tags['golf:holes'] ?? tags.holes);
  if (Number.isFinite(raw) && raw > 0) return raw >= 14 ? 18 : 9;
  return 18;
}

function extract(el) {
  const tags = el.tags || {};
  const name = (tags.name || '').trim();
  if (!name) return null; // Unnamed polygons are usually mapping fragments.

  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const holes = holesOf(tags);
  const par = Number(tags.par) || (holes === 9 ? 36 : 72);

  return {
    osmId: `${el.type[0]}${el.id}`,
    name,
    lat: Math.round(lat * 10000) / 10000,
    lng: Math.round(lng * 10000) / 10000,
    city: (tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || '').trim(),
    region: (tags['addr:county'] || tags['addr:state'] || tags['addr:province'] || '').trim(),
    holes,
    par,
    type: courseType(tags),
  };
}

// Rows: [id, name, lat, lng, city, region, country, continent, holes, par, type, holeParDigits]
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function buildSpatialIndex(rows) {
  const index = new Map();
  rows.forEach((r, i) => {
    const key = `${Math.round(r[2] * 100)}:${Math.round(r[3] * 100)}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(i);
  });
  return index;
}

/** True when an equivalent course is already in the catalogue. */
function isDuplicate(rows, index, candidate) {
  const latKey = Math.round(candidate.lat * 100);
  const lngKey = Math.round(candidate.lng * 100);
  const name = norm(candidate.name);
  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      for (const i of index.get(`${latKey + dLat}:${lngKey + dLng}`) ?? []) {
        const r = rows[i];
        // ~0.004 degrees is roughly 400 m of latitude.
        const near = Math.abs(r[2] - candidate.lat) < 0.004 && Math.abs(r[3] - candidate.lng) < 0.004;
        if (!near) continue;
        const a = norm(r[1]);
        if (a === name || a.includes(name) || name.includes(a)) return true;
      }
    }
  }
  return false;
}

async function main() {
  const args = parseArgs(process.argv);

  const unknown = args.regions.filter((r) => !REGIONS[r]);
  if (unknown.length) {
    console.error(`Unknown region(s): ${unknown.join(', ')}`);
    console.error(`Available: ${Object.keys(REGIONS).join(', ')}`);
    process.exit(1);
  }

  const existing = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')) : [];
  console.log(`Catalogue currently holds ${existing.length.toLocaleString()} courses.`);

  const rows = [...existing];
  const index = buildSpatialIndex(rows);
  const seenOsm = new Set(rows.map((r) => r[0]));

  let added = 0, skipped = 0;

  for (const region of args.regions) {
    const tiles = tilesFor(REGIONS[region], args.tile);
    console.log(`\n${region}: ${tiles.length} tiles`);

    for (let t = 0; t < tiles.length; t++) {
      const data = await overpass(tileQuery(tiles[t]));
      const elements = data.elements ?? [];
      let tileAdded = 0;

      for (const el of elements) {
        const c = extract(el);
        if (!c) continue;
        if (seenOsm.has(c.osmId)) continue;
        if (isDuplicate(rows, index, c)) {
          skipped++;
          continue;
        }

        const country = countryAt(c.lng, c.lat);
        const continent = continentFor(country, c.lng, c.lat);
        const row = [
          c.osmId, c.name, c.lat, c.lng, c.city, c.region,
          country, continent, c.holes, c.par, c.type, '',
        ];
        rows.push(row);
        seenOsm.add(c.osmId);
        const key = `${Math.round(c.lat * 100)}:${Math.round(c.lng * 100)}`;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(rows.length - 1);
        added++;
        tileAdded++;
      }

      console.log(
        `  [${t + 1}/${tiles.length}] ${elements.length} elements, +${tileAdded} new` +
          ` (total ${rows.length.toLocaleString()})`
      );
      await sleep(Number(process.env.OVERPASS_DELAY_MS ?? 1200)); // Shared free service.
    }
  }

  console.log(`\nAdded ${added.toLocaleString()}, skipped ${skipped.toLocaleString()} duplicates.`);

  if (args.dryRun) {
    console.log('Dry run — nothing written.');
    return;
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(rows));
  const mb = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2);
  console.log(`Wrote ${rows.length.toLocaleString()} courses to ${path.relative(ROOT, OUT_FILE)} (${mb} MB).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
