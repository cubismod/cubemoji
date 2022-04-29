import { getPaletteFromURL } from 'color-thief-node';

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