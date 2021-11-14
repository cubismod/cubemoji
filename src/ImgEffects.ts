// Image Effects like Rescale, Add Face, etc. are done in here
// all these functions produce files and the calling function is responsible for removing those
// from the fs once done
import { FileTypeResult, fromFile } from 'file-type'
import { random, randomFloat, randomIndex } from 'pandemonium'
import { downloadImage, getUrl } from './CommandHelper'
import gm = require('gm')
import path = require('path')
import { CubeMessageManager, Effects, ImageQueue } from './Cubemoji'
import { randomUUID } from 'crypto'
import { container } from 'tsyringe'
import { CommandInteraction, ContextMenuInteraction, Message, MessageAttachment, MessageReaction, PartialUser, User } from 'discord.js'
import { watch } from 'chokidar'
import strings from './res/strings.json'
import { stat } from 'fs/promises'

export type MsgContext = ContextMenuInteraction | CommandInteraction | MessageReaction

function compressImage (img: gm.State, ft: FileTypeResult) {
  switch (ft.ext) {
    case 'jpg':
      return img.quality(20)
        .geometry('60%')
    case 'png':
      return img.dither(true)
        .colors(50)
        .geometry('60%')
    case 'gif':
      return img.bitdepth(8)
        .colors(50)
  }
  return img
}

/**
 * perform a liquid rescale/ seam carving on an image
 * @param externalUrl the url of the image we will download and rescale
 * @returns path to image file
 */
export async function performRescale (externalUrl: string) {
  const localUrl = await downloadImage(externalUrl, true).catch(
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

// add an emoji (face) to any image
// return the file path to the edited image
export async function performAddFace (baseUrl: string, face: string) {
  const localUrl = await downloadImage(baseUrl)
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

// edits an image
// returns the file path to the edited image
// TODO: figure out why images occasionally return 0 byte files
export async function performEdit (baseUrl: string, effects: Effects[]) {
  const localUrl = await downloadImage(baseUrl)
  if (localUrl) {
    const ft = await fromFile(localUrl)
    const imageQueue = container.resolve(ImageQueue)
    if (ft && imageQueue) {
      const filename = path.resolve(`download/${randomUUID()}.${ft.ext}`)
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
      img.write(filename, async (err) => {
        if (err) console.error(err)
      })
      await imageQueue.enqueue(localUrl)
      await imageQueue.enqueue(filename)
      return filename
    } else {
      return undefined
    }
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

// parse effects strings to enums or generate random
// effects with an undefined
export function parseEffects (effects: string) {
  let parsedEffects: Effects[] = []
  // if no edit options specified, we will generate some
  if (effects === undefined || effects === '') parsedEffects = generateEditOptions()
  else {
    // here comes tedious parsing
    effects.split(' ').forEach(effect => {
      switch (effect.toLowerCase()) {
        case 'blur':
          parsedEffects.push(Effects.Blur)
          break
        case 'charcoal':
          parsedEffects.push(Effects.Charcoal)
          break
        case 'cycle':
          parsedEffects.push(Effects.Cycle)
          break
        case 'edge':
          parsedEffects.push(Effects.Edge)
          break
        case 'emboss':
          parsedEffects.push(Effects.Emboss)
          break
        case 'enhance':
          parsedEffects.push(Effects.Enhance)
          break
        case 'equalize':
          parsedEffects.push(Effects.Equalize)
          break
        case 'flip':
          parsedEffects.push(Effects.Flip)
          break
        case 'flop':
          parsedEffects.push(Effects.Flop)
          break
        case 'implode':
          parsedEffects.push(Effects.Implode)
          break
        case 'magnify':
          parsedEffects.push(Effects.Magnify)
          break
        case 'median':
          parsedEffects.push(Effects.Median)
          break
        case 'minify':
          parsedEffects.push(Effects.Minify)
          break
        case 'monochrome':
          parsedEffects.push(Effects.Monochrome)
          break
        case 'mosaic':
          parsedEffects.push(Effects.Monochrome)
          break
        case 'motionblur':
          parsedEffects.push(Effects.Motionblur)
          break
        case 'noise':
          parsedEffects.push(Effects.Noise)
          break
        case 'normalize':
          parsedEffects.push(Effects.Normalize)
          break
        case 'paint':
          parsedEffects.push(Effects.Paint)
          break
        case 'roll':
          parsedEffects.push(Effects.Roll)
          break
        case 'sepia':
          parsedEffects.push(Effects.Sepia)
          break
        case 'sharpen':
          parsedEffects.push(Effects.Sharpen)
          break
        case 'solarize':
          parsedEffects.push(Effects.Solarize)
          break
        case 'spread':
          parsedEffects.push(Effects.Spread)
          break
        case 'swirl':
          parsedEffects.push(Effects.Swirl)
          break
        case 'threshold':
          parsedEffects.push(Effects.Threshold)
          break
        case 'trim':
          parsedEffects.push(Effects.Trim)
          break
        case 'wave':
          parsedEffects.push(Effects.Wave)
          break
      }
    })
  }
  return parsedEffects
}

// discord logic for doing a rescale
export async function rescaleDiscord (context: MsgContext, source: string, user: User | PartialUser) {
  if (source === null) return
  const url = await getUrl(source)
  if (url) {
    startTyping(context)
    // do the rescale
    const filename = await performRescale(url)
    const cubeMessageManager = container.resolve(CubeMessageManager)
    if (filename) {
      const watcher = watch(filename, { awaitWriteFinish: true })
      watcher.on('add', async () => {
        // now we send out the rescaled message
        const msg = await reply(context, new MessageAttachment(filename))
        await watcher.close()
        // add trash can reaction
        if (!msg) {
          console.error('could not get a message during rescale, not proceeding with adding trash react')
        } else {
          if (msg instanceof Message) cubeMessageManager.registerTrashReact(context, msg, user.id)
        }
      })
    } else await reply(context, '**Error**: could not perform rescale')
  } else await reply(context, strings.imgErr)
}

// the actual discord logic for doing an edit
// source is an emote or other parsable
export async function editDiscord (context: MsgContext, effects: string, source: string | null, user: User | PartialUser) {
  if (source === null) return
  const parsedEffects = parseEffects(effects)
  // done parsing the effects, now let's try and parse what we're trying to edit
  const url = await getUrl(source)
  if (url) {
    startTyping(context)
    // now perform the edit
    const filename = await performEdit(url, parsedEffects)
    const cubeMessageManager = container.resolve(CubeMessageManager)
    if (filename) {
      const watcher = watch(filename, { awaitWriteFinish: true })
      watcher.on('add', async () => {
        // file has finished processing from gm
        const msg = await reply(context, new MessageAttachment(filename))
        await watcher.close()
        // now add a trash can reaction
        if (!msg) {
          console.error('could not get a message during edit, not proceeding with adding trash react')
        } else {
          if (msg instanceof Message) cubeMessageManager.registerTrashReact(context, msg, user.id)
        }
      })
    } else {
      await reply(context, '**Error**: could not perform the edit')
    }
  } else {
    await reply(context, strings.imgErr)
  }
}

// do a different reply depending on the context we have
async function reply (context: MsgContext, content: MessageAttachment | string) {
  let msg: Message | undefined
  if (content instanceof MessageAttachment) {
    // different logic depending on which context we are passing in
    if (context instanceof CommandInteraction) {
      const repMsg = await context.editReply({ files: [content] })
      if (repMsg instanceof Message) msg = repMsg
    }
    if (context instanceof ContextMenuInteraction) {
      const repMsg = await context.editReply({ files: [content] })
      if (repMsg instanceof Message) msg = repMsg
    }
    if (context instanceof MessageReaction) msg = await context.message.reply({ files: [content], allowedMentions: { repliedUser: false } })
    return msg
  } else {
    if (context instanceof CommandInteraction) {
      const repMsg = await context.editReply(content)
      if (repMsg instanceof Message) msg = repMsg
    }
    if (context instanceof ContextMenuInteraction) {
      const repMsg = await context.editReply({ content: content })
      if (repMsg instanceof Message) msg = repMsg
    }
    if (context instanceof MessageReaction) msg = await context.message.reply({ content: content, allowedMentions: { repliedUser: false } })
  }
}

// type to indicate that cubemoji is working on the edit/rescale
async function startTyping (context: MsgContext) {
  if (context instanceof MessageReaction) {
    context.message.channel.sendTyping()
  }
}
