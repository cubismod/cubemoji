// Image Effects like Rescale, Add Face, etc. are done in here
import Jimp = require('jimp')


export async function addFace (baseUrl: string, faceUrl: string) {
  const flush = await Jimp.read(baseUrl)
  const baseEmote = await Jimp.read(faceUrl)
  flush.contain(baseEmote.bitmap.width, baseEmote.bitmap.height, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE)
  const mask = baseEmote.clone()
  // create a mask image to ensure shadow doesn't go over transparent regions
  mask.grayscale()
  mask.opaque()
  if (faceUrl.includes('jfc')) flush.mask(mask, 0, 0)
  baseEmote.composite(flush, 0, 0, { mode: Jimp.BLEND_SOURCE_OVER, opacityDest: 1, opacitySource: 1 })
  return baseEmote.getBufferAsync(Jimp.AUTO.toString()).then(buf => {
    return buf
  })
}
