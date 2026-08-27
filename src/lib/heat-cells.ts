import { cataloguePoints, CoursePoint } from '@/data/course-catalogue';

/**
 * The catalogue holds 15,000+ courses. Drawing one dot each would be both
 * illegible and far too slow, so positions are binned into a lat/lng grid and
 * drawn as density blobs — which is also what gives the globe its city-lights
 * look rather than a cloud of pins.
 */
export type HeatCell = {
  latitude: number;
  longitude: number;
  count: number;
};

const CELL_DEGREES = 2.5;

function binPoints(points: CoursePoint[]): HeatCell[] {
  const bins = new Map<string, { lat: number; lng: number; count: number }>();
  for (const p of points) {
    const latBin = Math.floor(p.latitude / CELL_DEGREES);
    const lngBin = Math.floor(p.longitude / CELL_DEGREES);
    const key = `${latBin}:${lngBin}`;
    const existing = bins.get(key);
    if (existing) {
      existing.lat += p.latitude;
      existing.lng += p.longitude;
      existing.count += 1;
    } else {
      bins.set(key, { lat: p.latitude, lng: p.longitude, count: 1 });
    }
  }
  // Use the mean position within each cell so blobs sit over the real cluster.
  return [...bins.values()].map((b) => ({
    latitude: b.lat / b.count,
    longitude: b.lng / b.count,
    count: b.count,
  }));
}

let cells: HeatCell[] | null = null;

export function catalogueHeatCells(): HeatCell[] {
  if (!cells) cells = binPoints(cataloguePoints());
  return cells;
}

export function maxCellCount(): number {
  return catalogueHeatCells().reduce((m, c) => Math.max(m, c.count), 1);
}
