// Maps world-atlas country ids (ISO 3166-1 numeric) to the app's continents,
// from the world-countries package (ODbL). Run: node scripts/build-country-continents.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const countries = JSON.parse(
  readFileSync(new URL('../node_modules/world-countries/countries.json', import.meta.url))
);
const out = {};
for (const c of countries) {
  if (!c.ccn3) continue;
  let continent;
  if (c.region === 'Americas')
    continent = c.subregion === 'South America' ? 'South America' : 'North America';
  else if (c.region === 'Oceania') continent = 'Australia';
  else if (c.region === 'Antarctic') continue;
  else continent = c.region; // Africa, Asia, Europe
  out[c.ccn3] = continent;
}
writeFileSync(new URL('../src/data/country-continents.json', import.meta.url), JSON.stringify(out));
console.log('wrote', Object.keys(out).length, 'countries');
