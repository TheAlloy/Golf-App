/** Browser tile loading: a decoded image WebGL can upload directly. */
export type TilePixels = HTMLImageElement;

export async function loadTile(url: string): Promise<TilePixels> {
  const image = new Image();
  // Needed so the canvas isn't tainted when the tile is uploaded as a texture.
  image.crossOrigin = 'anonymous';
  image.src = url;
  await image.decode();
  return image;
}
