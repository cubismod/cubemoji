// Image Effects like Rescale, Add Face, etc. are done in here
import { fromFile } from 'file-type'
import Jimp = require('jimp')
import { random } from 'pandemonium'
import { downloadImage } from '../CommandHelper'
import gm = require('gm')
import path = require('path')

// perform a liquid rescale/ seam carving on an image
// returns the path to the image file
export async function rescale (externalUrl: string) {
  const localUrl = await downloadImage(externalUrl)
  // now we need build our edit parameters for graphicsmagick
  let newSize = ''
  switch (random(0, 2)) {
    case 0:
      // set a width
      newSize = random(10, 1000).toString()
      break
    case 1:
      // set a height
      newSize = `x${random(10, 1000)}`
      break
    case 2:
      // ignore aspect ratio
      newSize = `${random(10, 1000)}x${random(10, 1000)}!`
  }
  // get the file type of the image file
  const ft = await fromFile(localUrl)
  if (ft !== undefined) {
    const filePath = path.join(path.resolve('./../../download'), `${Date.now()}.${ft.ext}}`)
    // imagemagick only has liquid rescale, not graphicsmagick
    gm.subClass({ imageMagick: true })(localUrl)
      .out('-liquidrescale', newSize)
      .write(filePath, (err) => {
        if (err) {
          throw (err)
        }
      })
    return filePath
  } else {
    throw Error('could not determine filetype of image')
  }
}

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
