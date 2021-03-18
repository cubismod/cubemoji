// code used for various workers that actually process images
const Pand = require('pandemonium')
const Jimp = require('jimp')
const workerpool = require('workerpool')
const { BLEND_SOURCE_OVER } = require('jimp')

function editImage (url, options) {
  // edit function that we pass to workers
  // limit the amount of commands that can be performed at once since this runs synchronously
  return Jimp.read(url).then(emote => {
    // convolution info https://docs.gimp.org/2.6/en/plug-in-convmatrix.html
    options.forEach(option => {
      switch (option) {
        // let the user use shorter aliases that fall through
        case 'em':
        case 'emboss':
          emote.convolute([[-2, -1, 0], [-1, 1, 1], [0, 1, 2]])
          break
        case 'ed':
        case 'edge_detect':
          emote.convolute([[0, 1, 0], [1, -4, 1], [0, 1, 0]])
          break
        case 'sh':
        case 'sharpen':
          emote.convolute([[0, 0, 0, 0, 0], [0, 0, -1, 0, 0], [0, -1, 5, -1, 0], [0, 0, -1, 0, 0], [0, 0, 0, 0, 0]])
          break
        case 'gs':
        case 'grayscale':
          emote.grayscale()
          break
        case 'bl':
        case 'blur':
          emote.blur(1)
          break
        case 'sp':
        case 'sepia':
          emote.sepia()
          break
          // limit the number of scales to preserve memory
        case 'rtro':
        case 'rightrotate':
          emote.rotate(-15)
          break
        case 'lfro':
        case 'leftrotate':
          emote.rotate(15)
          break
        case 'scup':
        case 'scaleup':
          emote.scale(1.2)
          break
        case 'scdn':
        case 'scaledown':
          emote.scale(0.8)
          break
        case 'fl':
        case 'flip':
          emote.flip(true, false)
          break
        case 'ud':
        case 'upsidedown':
          emote.flip(false, true)
          break
      }
      // ensure the image can't get too huge
      if (emote.bitmap.width > 512 || emote.bitmap.height > 512) {
        emote.scaleToFit(512, 512)
      }
    }
    )
    return emote.getBufferAsync(Jimp.AUTO).then(buf => {
      return buf
    })
    // catch if jimp fails to get the buffer asynchronously
      .catch(reason => console.error(reason))
  })
  // catch statement if JIMP fails to load the image
    .catch(reason => console.error(reason))
}

function addFace (baseUrl, faceUrl) {
  return Jimp.read(faceUrl).then(flush => {
    return Jimp.read(baseUrl).then(baseEmote => {
      // do a bit of transformation of the face
      flush.contain(baseEmote.bitmap.width, baseEmote.bitmap.height, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE)
      const mask = baseEmote.clone()
      // create a mask image to ensure shadow doesn't go over transparent regions
      mask.grayscale()
      mask.opaque()
      if (faceUrl.includes('jfc')) flush.mask(mask, 0, 0)
      baseEmote.composite(flush, 0, 0, { mode: BLEND_SOURCE_OVER })
      return baseEmote.getBufferAsync(Jimp.AUTO).then(buf => {
        return buf
      })
        .catch(reason => console.error(reason)) // unable to get async buf
    })
      .catch(reason => console.error(reason)) // unable to read url of user emote
  })
    .catch(reason => console.error(reason)) // unable to read base flushed image
}

workerpool.worker({
  editImage: editImage,
  addFace: addFace
})
