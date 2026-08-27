#!/usr/bin/env node
/**
 * Build src/data/courses.json from scratch.
 *
 *   node scripts/build-catalogue.mjs
 *
 * Sources, in order:
 *   1. scripts/seeds/international-courses.json — a hand-curated set of
 *      notable courses outside the US, so the globe is never empty.
 *   2. The OpenGolfAPI US dataset (ODbL), downloaded from GitHub. This is the
 *      only source with hole-by-hole par, so its rows win over anything else.
 *
 * Run scripts/import-osm-courses.mjs afterwards to add the rest of the world
 * from OpenStreetMap; it merges into the same file without touching what is
 * already there.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { continentFor, countryAt } from './lib/geo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(ROOT, 'src/data/courses.json');
const SEED_FILE = path.join(ROOT, 'scripts/seeds/international-courses.json');
const US_CSV_URL = 'https://raw.githubusercontent.com/opengolfapi/data/main/opengolfapi-us.csv';

/** Minimal RFC4180 parser — fields may be quoted and contain commas. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Rows: [id, name, lat, lng, city, region, country, continent, holes, par, type, holeParDigits]
function seedRows() {
  const seeds = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  return seeds.map((c) => [
    c.id, c.name, c.latitude, c.longitude, c.city, '',
    c.country, c.continent, c.holes, c.par, c.type, '',
  ]);
}

async function usRows() {
  console.log('Downloading the OpenGolfAPI US dataset…');
  const res = await fetch(US_CSV_URL);
  if (!res.ok) throw new Error(`Could not download US dataset: HTTP ${res.status}`);
  const text = await res.text();

  const rows = parseCsv(text);
  const idx = Object.fromEntries(rows[0].map((h, i) => [h, i]));
  const out = [];

  for (const r of rows.slice(1)) {
    if (r.length < rows[0].length) continue;
    const name = r[idx.name]?.trim();
    const lat = Number(r[idx.latitude]);
    const lng = Number(r[idx.longitude]);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const holePars = [];
    for (let h = 1; h <= 18; h++) {
      const v = Number(r[idx[`hole_${h}_par`]]);
      holePars.push(Number.isFinite(v) && v > 0 ? v : 0);
    }
    const mapped = holePars.filter((p) => p > 0).length;
    const par = Number(r[idx.par]) || 72;
    // The source "holes" column counts holes mapped in OSM and is often
    // partial (14 on a par-72 course), so derive it from the hole pars.
    const holes = mapped === 18 || mapped === 9 ? mapped : par >= 60 ? 18 : 9;

    out.push([
      r[idx.id].slice(0, 12),
      name,
      Math.round(lat * 10000) / 10000,
      Math.round(lng * 10000) / 10000,
      (r[idx.city] || '').trim(),
      (r[idx.state] || '').trim(),
      'United States of America',
      'North America',
      holes,
      par,
      (r[idx.type] || '').trim(),
      mapped ? holePars.join('') : '',
    ]);
  }
  return out;
}

async function main() {
  const seeds = seedRows();
  console.log(`Curated international seeds: ${seeds.length}`);

  const us = await usRows();
  console.log(`US courses: ${us.length.toLocaleString()}`);

  // Sanity-check the offline country lookup against a known coordinate.
  const check = countryAt(-2.8025, 56.3433);
  console.log(`Country lookup self-test (St Andrews): ${check} / ${continentFor(check, -2.8, 56.3)}`);

  const rows = [...seeds, ...us];
  fs.writeFileSync(OUT_FILE, JSON.stringify(rows));
  const mb = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2);
  console.log(`\nWrote ${rows.length.toLocaleString()} courses to src/data/courses.json (${mb} MB).`);
  console.log('Next: node scripts/import-osm-courses.mjs --region=europe');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
