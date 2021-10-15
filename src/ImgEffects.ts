// Image Effects like Rescale, Add Face, etc. are done in here
// all these functions produce files and the calling function is responsible for removing those
// from the fs once done
import { fromFile } from 'file-type'
import { random, randomFloat, randomIndex } from 'pandemonium'
import { downloadImage } from './CommandHelper'
import gm = require('gm')
import path = require('path')
import { Effects } from './Cubemoji'

// perform a liquid rescale/ seam carving on an image
// returns the path to the image file
export async function performRescale (externalUrl: string) {
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
    const filePath = path.resolve(`download/${Date.now()}.${ft.ext}}`)
    // imagemagick only has liquid rescale, not graphicsmagick
    gm.subClass({ imageMagick: true })(localUrl)
      .out('-liquidrescale', newSize)
      .write(filePath, (err) => {
        if (err) throw (err)
      })
    return filePath
  } else {
    return undefined
  }
}

// add an emoji (face) to any image
// return the file path to the edited image
export async function addFace (baseUrl: string, face: string) {
  const localUrl = await downloadImage(baseUrl)
  // this also determines if the base image exists
  const ft = await fromFile(localUrl)
  if (ft !== undefined) {
    const filePath = path.resolve(`download/${Date.now()}.${ft.ext}}`)
    gm(localUrl)
      // test this
      .composite(path.resolve(`assets/${face}.png`))
      .write(filePath, (err) => {
        if (err) throw (err)
      })
    return filePath
  } else {
    return undefined
  }
}

// edits an image
// returns a buffer to the edited image
export async function performEdit (baseUrl: string, effects: Effects[]) {
  const localUrl = await downloadImage(baseUrl)
  const ft = await fromFile(localUrl)
  if (ft !== undefined) {
    const img = gm(localUrl)
    // apply all the image effects one by one according to the string
    effects.forEach(effect => {
      switch (effect) {
        case Effects.Blur:
          img.blur(5, 20)
          break
        case Effects.Charcoal:
          img.charcoal(randomFloat(0, 5))
          break
        case Effects.Cycle:
          img.cycle(random(1, 10))
          break
        case Effects.Edge:
          img.edge(randomFloat(0.1, 4))
          break
        case Effects.Emboss:
          img.emboss()
          break
        case Effects.Enhance:
          img.enhance()
          break
        case Effects.Equalize:
          img.equalize()
          break
        case Effects.Flip:
          img.flip()
          break
        case Effects.Flop:
          img.flop()
          break
        case Effects.Implode:
          img.implode()
          break
        case Effects.Magnify:
          img.magnify(2)
          break
        case Effects.Median:
          img.median(random(1, 10))
          break
        case Effects.Minify:
          img.minify(random(1, 10))
          break
        case Effects.Monochrome:
          img.monochrome()
          break
        case Effects.Mosaic:
          img.mosaic()
          break
        case Effects.Motionblur:
          img.motionBlur(10, 20, random(0, 360))
          break
        case Effects.Noise:
          img.noise(10)
          break
        case Effects.Normalize:
          img.normalize()
          break
        case Effects.Paint:
          img.paint(10)
          break
        case Effects.Roll:
          img.roll(randomIndex([-360, 360]), randomIndex([-360, 360]))
          break
        case Effects.Sepia:
          img.sepia()
          break
        case Effects.Sharpen:
          img.sharpen(100)
          break
        case Effects.Solarize:
          img.solarize(randomFloat(0, 100))
          break
        case Effects.Spread:
          img.spread(randomFloat(0, 5))
          break
        case Effects.Swirl:
          img.swirl(random(-360, 360))
          break
        case Effects.Threshold:
          img.threshold(randomFloat(0, 20))
          break
        case Effects.Trim:
          img.trim()
          break
        case Effects.Wave:
          img.wave(randomFloat(0.01, 10), randomFloat(0.01, 10))
          break
      }
    })
    return img.toBuffer((err, buffer) => {
      if (err) console.error(err)
      else {
        return buffer
      }
    })
  } else {
    return undefined
  }
}

// generate a set of up to 10 random edit options
export function generateEditOptions () {
  const options: Effects[] = []
  const optLen = random(1, 10)
  for (let i = 0; i < optLen; i++) {
    // there are 29 effects options in the enum
    // if i ever add more i'll need to change this bit
    options.push(random(0, 29))
  }
  return options
}
