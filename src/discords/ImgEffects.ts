// Image Effects like Rescale, Add Face, etc. are done in here
import { fromFile } from 'file-type'
import { random } from 'pandemonium'
import { downloadImage } from '../CommandHelper'
import gm = require('gm')
import path = require('path')
import strings from '../res/strings.json'

const projDir = path.resolve('../../')

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
    const filePath = path.join(projDir, `download/${Date.now()}.${ft.ext}}`)
    // imagemagick only has liquid rescale, not graphicsmagick
    gm.subClass({ imageMagick: true })(localUrl)
      .out('-liquidrescale', newSize)
      .write(filePath, (err) => {
        if (err) throw (err)
      })
    return filePath
  } else {
    throw Error(strings.fileTypeUndetermined)
  }
}

// add an emoji (face) to any image
// return the file path to the edited image
export async function addFace (baseUrl: string, face: string) {
  // this also determines if the base image exists
  const ft = await fromFile(baseUrl)
  if (ft !== undefined) {
    const filePath = path.join(projDir, `download/${Date.now()}.${ft.ext}}`)
    gm(baseUrl)
      // test this
      .composite(path.join(projDir, `assets/${face}.png`))
      .write(filePath, (err) => {
        if (err) throw (err)
      })
    return filePath
  } else {
    throw Error(strings.fileTypeUndetermined)
  }
}
