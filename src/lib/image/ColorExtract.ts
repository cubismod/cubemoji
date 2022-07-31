import { getPaletteFromURL, Palette } from 'color-thief-node';

/**
 * attempts to parse an image to get the key colors
 * in an image
 * @param url image url
 * @returns color palette
 */
export async function getColors(url: string) {
  const palette = await getPaletteFromURL(url);
  return palette;
}

export function paletteToInt(palette: Palette) {
  let intVersion = palette[0];
  intVersion = (intVersion << 8) + palette[1];
  intVersion = (intVersion << 8) + palette[2];

  return intVersion;
}
