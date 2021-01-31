// code used for various workers
const Pand = require('pandemonium')
const Jimp = require('jimp')
const workerpool = require('workerpool')

function editImage (url, options) {
  // edit function that we pass to workers
  // limit the amount of commands that can be performed at once since this runs synchronously
  return Jimp.read(url).then(emote => {
    // convolution info https://docs.gimp.org/2.6/en/plug-in-convmatrix.html
    let scaleAmts = 0
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
          emote.blur(Pand.random(1, 5))
          break
        case 'sp':
        case 'sepia':
          emote.sepia()
          break
          // limit the number of scales to preserve memory
        case 'rt':
        case 'rotate':
          if (scaleAmts < 6) {
            emote.rotate(Pand.random(-360, 360))
            scaleAmts++
          }
          break
        case 'sc':
        case 'scale':
          if (scaleAmts < 6) {
            emote.scale(Pand.randomFloat(0.1, 2))
            scaleAmts++
          }
          break
      }
      // ensure the image can't get too huge
      if (emote.bitmap.width > 256 || emote.bitmap.height > 256) {
        emote.scaleToFit(256, 256)
      }
    }
    )
    return emote.getBufferAsync(Jimp.AUTO).then(buf => {
      return buf
    })
    // catch if jimp fails to get the buffer asynchronously
      .catch(reason => console.log(reason))
  })
  // catch statement if JIMP fails to load the image
    .catch(reason => console.log(reason))
}

function addFlush (url) {
  return Jimp.read('./assets/flushed.png').then(flush => {
    return Jimp.read(url).then(baseEmote => {
      // do a bit of transformation of the face
      flush.contain(baseEmote.bitmap.width, baseEmote.bitmap.height, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE)
      baseEmote.composite(flush, 0, 0, { mode: Jimp.BLEND_SOURCE_OVER })
      return baseEmote.getBufferAsync(Jimp.AUTO).then(buf => {
        return buf
      })
        .catch(reason => console.log(reason)) // unable to get async buf
    })
      .catch(reason => console.log(reason)) // unable to read url of user emote
  })
    .catch(reason => console.log(reason)) // unable to read base flushed image
}

workerpool.worker({
  editImage: editImage,
  addFlush: addFlush
})
