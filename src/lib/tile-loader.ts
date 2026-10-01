import { Directory, File, Paths } from 'expo-file-system';

/**
 * Native tile loading. expo-gl uploads a texture from any object carrying a
 * `localUri`, so a tile is downloaded into the cache directory once and then
 * handed over by path. The files double as an on-disk cache across launches.
 */
export type TilePixels = { localUri: string; width: number; height: number };

const TILE_DIR = new Directory(Paths.cache, 'imagery-tiles');

function fileName(url: string): string {
  // Short, filesystem-safe and stable for a given URL.
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const ext = url.toLowerCase().includes('.png') ? 'png' : 'jpg';
  return `${h.toString(16)}.${ext}`;
}

export async function loadTile(url: string, size = 256): Promise<TilePixels> {
  if (!TILE_DIR.exists) TILE_DIR.create({ intermediates: true, idempotent: true });
  const file = new File(TILE_DIR, fileName(url));
  if (!file.exists) await File.downloadFileAsync(url, file, { idempotent: true });
  return { localUri: file.uri, width: size, height: size };
}
