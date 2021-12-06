import { fromFile } from 'file-type'
import { random, randomFloat, randomIndex } from 'pandemonium'
import { downloadImage } from './CommandHelper'
import gm from 'gm'
import path from 'path'
import { ImageQueue } from './Cubemoji'
import { randomUUID } from 'crypto'
import { container } from 'tsyringe'
import { stat } from 'fs/promises'
import { compressImage } from './ImgEffects'

// edits an image
// returns the file path to the edited image
// TODO: figure out why images occasionally return 0 byte files

export async function performEdit (baseUrl: string, effects: string[]) {
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
