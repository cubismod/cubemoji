// Image Effects like Rescale, Add Face, etc. are done in here
// all these functions produce files and the calling function is responsible for removing those
// from the fs once done
import { randomUUID } from 'crypto'
import { CommandInteraction, ContextMenuInteraction, MessageReaction } from 'discord.js'
import { FileTypeResult, fromFile } from 'file-type'
import { createWriteStream } from 'fs'
import { stat } from 'fs/promises'
import gm from 'gm'
import got from 'got/dist/source'
import { choice, random, randomFloat, randomIndex } from 'pandemonium'
import path from 'path'
import { pipeline } from 'stream/promises'
import { container } from 'tsyringe'
import { promisify } from 'util'
import imgEffects from '../res/imgEffects.json'
import { gotOptions, ImageQueue } from './Cubemoji'

export type MsgContext = ContextMenuInteraction | CommandInteraction | MessageReaction

/**
* logic for performing edits/rescales/addfaces
* with imagemagick and their corresponding helper functions
*/
/**
  * perform a liquid rescale/ seam carving on an image
  * @param externalUrl the url of the image we will download and rescale
  * @returns path to image file
  */
export async function rescale (externalUrl: string) {
  const localUrl = await downloadImage(externalUrl).catch(
    err => {
      console.error(err)
    }
  )
  const imageQueue = container.resolve(ImageQueue)
  if (localUrl && imageQueue) {
    // now we need build our rescale parameters for graphicsmagick
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
      const filePath = path.resolve(`download/${randomUUID()}.${ft.ext}`)
      // imagemagick only has liquid rescale, not graphicsmagick
      const im = gm.subClass({ imageMagick: true })
      let ourImg = im(localUrl)
      const fileInfo = await stat(localUrl)
      if (fileInfo.size > 500000) {
        // if the file size is greater than 0.5 mb we try to perform some compression
        // on that file
        ourImg = compressImage(ourImg, ft)
      }
      ourImg
        .out('-liquid-rescale', newSize)
        .write(filePath, (err) => {
          if (err) throw (err)
        })
      await imageQueue.enqueue(localUrl)
      await imageQueue.enqueue(filePath)
      return filePath
    } else {
      return undefined
    }
  }
}

// edits an image
// returns the file path to the edited image
// TODO: figure out why images occasionally return 0 byte files
export async function edit (baseUrl: string, effects: string[]) {
  const localUrl = await downloadImage(baseUrl).catch(err => console.error(err))
  if (localUrl) {
    const ft = await fromFile(localUrl)
    const imageQueue = container.resolve(ImageQueue)

    if (ft && imageQueue) {
      const filename = path.resolve(`download/${randomUUID()}.${ft.ext}`)
      let img = gm(localUrl)
      // apply all the image effects one by one according to the string
      const fileInfo = await stat(localUrl)
      if (fileInfo.size > 500000) {
        img = compressImage(img, ft)
      }
      effects.forEach(effect => {
        switch (effect) {
          case 'blur':
            img.blur(5, 20)
            break
          case 'charcoal':
            img.charcoal(randomFloat(0, 5))
            break
          case 'cycle':
            img.cycle(random(1, 10))
            break
          case 'edge':
            img.edge(randomFloat(0.1, 4))
            break
          case 'emboss':
            img.emboss()
            break
          case 'enhance':
            img.enhance()
            break
          case 'equalize':
            img.equalize()
            break
          case 'flip':
            img.flip()
            break
          case 'flop':
            img.flop()
            break
          case 'implode':
            img.implode()
            break
          case 'magnify':
            img.magnify(2)
            break
          case 'median':
            img.median(random(1, 10))
            break
          case 'minify':
            img.minify(random(1, 10))
            break
          case 'monochrome':
            img.monochrome()
            break
          case 'mosaic':
            img.mosaic()
            break
          case 'motionblur':
            img.motionBlur(10, 20, random(0, 360))
            break
          case 'noise':
            img.noise(10)
            break
          case 'normalize':
            img.normalize()
            break
          case 'paint':
            img.paint(10)
            break
          case 'roll':
            img.roll(randomIndex([-360, 360]), randomIndex([-360, 360]))
            break
          case 'sepia':
            img.sepia()
            break
          case 'sharpen':
            img.sharpen(100)
            break
          case 'solarize':
            img.solarize(randomFloat(0, 100))
            break
          case 'spread':
            img.spread(randomFloat(0, 5))
            break
          case 'swirl':
            img.swirl(random(-360, 360))
            break
          case 'threshold':
            img.threshold(randomFloat(0, 20))
            break
          case 'trim':
            img.trim()
            break
          case 'wave':
            img.wave(randomFloat(0.01, 10), randomFloat(0.01, 10))
            break
          case 'contrast':
            img.contrast(+2)
            break
          case 'desaturate':
            img.modulate(100, 50)
            break
          case 'negative':
            img.negative()
            break
          case 'saturate':
            img.modulate(100, 150)
            break
          case 'shear':
            img.shear(random(0, 360), random(0, 360))
            break
        }
      })
      img.write(filename, async (err) => {
        if (err) { console.error(err) }
      })
      await imageQueue.enqueue(localUrl)
      await imageQueue.enqueue(filename)
      return filename
    } else {
      return undefined
    }
  }
}

// add an emoji (face) to any image
// return the file path to the edited image
export async function addface (baseUrl: string, face: string) {
  const localUrl = await downloadImage(baseUrl).catch(err => console.error(err))
  const imageQueue = container.resolve(ImageQueue)
  if (localUrl && imageQueue) {
    // this also determines if the base image exists
    const ft = await fromFile(localUrl)
    if (ft !== undefined) {
      const filePath = path.resolve(`download/${randomUUID()}.${ft.ext}`)
      const faceUrl = `assets/${face}.png`
      // now need to determine width and height of background image
      gm(faceUrl).identify((err, info) => {
        if (err) console.error(err)
        else {
          const im = gm.subClass({ imageMagick: true })
          im(localUrl)
            .composite(path.resolve(faceUrl))
            .geometry(info.size.width, info.size.height, '!')
            .write(filePath, (err) => {
              if (err) console.error(err)
            })
        }
      })

      imageQueue.enqueue(localUrl)
      imageQueue.enqueue(filePath)
      return filePath
    } else {
      return undefined
    }
  }
}

/**
  * apply compression to a graphicsmagick state object
  * @param img the image we will compress
  * @param ft the filetype of that image
  * @returns graphicsmagick state object with compression applied
  */
export function compressImage (img: gm.State, ft: FileTypeResult) {
  switch (ft.ext) {
    case 'jpg':
      return img.quality(20)
        .geometry('60%')
    case 'png':
      return img.geometry('60%')
    case 'gif':
      return img.bitdepth(8)
        .colors(50)
  }
  return img
}

// generate a set of up to 10 random edit options
export function generateEditOptions (preset = '') {
  const options: string[] = []
  const optLen = random(1, 10)
  let effs = imgEffects
  // specific dumb presets for effects by limiting
  // the options that can be chosen
  switch (preset) {
    case 'deepfry': {
      effs = ['emboss', 'sharpen', 'magnify', 'median', 'emboss', 'saturate', 'normalize', 'negative']
    }
  }
  for (let i = 0; i < optLen; i++) {
    options.push(choice(effs))
  }
  return options
}

// parse effects strings to enums or generate random
// effects with an undefined string passed in
export function splitEffects (effects: string) {
  let effectsList: string[] = []
  // if no edit options specified, we will generate some
  if (effects === undefined || effects === '') effectsList = generateEditOptions()
  else {
    effectsList = effects.split(' ').slice(0, 20)
  }
  return effectsList
}

/**
* download an image file to the local FS under the download folder
* or use the cached version if that is saved
* @param url - link to the img
* @returns promise for local filename or undefined if can't be downloaded
*/
export async function downloadImage (url: string) {
  // check cache
  const queue = container.resolve(ImageQueue)
  const res = await queue.search(url)
  if (res) return res.url
  // otherwise we download
  // add timeouts and limit retries with got
  // check first whether the file isn't too big
  const headers = await got.head(url, gotOptions)
    .catch(err => {
      console.error(err)
      return undefined
    })
  if (headers && headers.headers['content-length'] && parseInt(headers.headers['content-length']) < 2e+7) {
    // limit to 2mb download
    const fn = path.resolve(`download/${randomUUID()}`)
    const pl = promisify(pipeline)
    await pl(
      got.stream(url, gotOptions)
        .on('error', (error: Error) => {
          console.error(error.message)
        }),
      createWriteStream(fn)
        .on('error', (error: Error) => { reject(error) })
    )
    return fn
  }
}