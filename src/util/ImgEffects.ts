// Image Effects like Rescale, Add Face, etc. are done in here
// all these functions produce files and the calling function is responsible for removing those
// from the fs once done
import { FileTypeResult, fromFile } from 'file-type'
import { choice, random, randomFloat, randomIndex } from 'pandemonium'
import { downloadImage, getUrl } from './CommandHelper'
import gm from 'gm'
import path from 'path'
import { ImageQueue } from './Cubemoji'
import { CubeMessageManager } from './MessageManager'
import { randomUUID } from 'crypto'
import { container } from 'tsyringe'
import { CommandInteraction, ContextMenuInteraction, Message, MessageAttachment, MessageReaction, PartialUser, User } from 'discord.js'
import { watch } from 'chokidar'
import { stat } from 'fs/promises'
import secrets from '../../secrets.json'
import imgEffects from '../res/imgEffects.json'
import { CubeStorage } from './Storage'

export type MsgContext = ContextMenuInteraction | CommandInteraction | MessageReaction

/**
* logic for performing edits/rescales/addfaces
* with imagemagick and their corresponding helper functions
*/
namespace ImageLogic {
  /**
  * perform a liquid rescale/ seam carving on an image
  * @param externalUrl the url of the image we will download and rescale
  * @returns path to image file
  */
  export async function rescale (externalUrl: string) {
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
}

namespace DiscordLogic {
  // discord logic for doing a rescale
  export async function rescale (context: MsgContext, source: string, user: User | PartialUser) {
    if (source === null) return
    const url = await getUrl(source)
    if (url) {
      startTyping(context)
      // do the rescale
      const filename = await ImageLogic.rescale(url)
      if (filename === undefined) {
        // error in performing the command, react with emote
        reactErr(context)
        return
      }
      const cubeMessageManager = container.resolve(CubeMessageManager)
      const storage = container.resolve(CubeStorage)
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
            if (msg instanceof Message) {
              await cubeMessageManager.registerTrashReact(context, msg, user.id)
              await storage.imageJobs.set(msg.id, {
                owner: user.id,
                type: 'rescale',
                source: source
              })
            }
          }
        })
      }
    } else {
      // image error of some sort
      console.error(`Rescale failed for ${user.id} (user id) on ${source} (source)`)
      await reactErr(context)
    }
  }

  // the actual discord logic for doing an edit
  // source is an emote or other parsable
  export async function edit (context: MsgContext, effects: string, source: string | null, user: User | PartialUser) {
    if (source === null) return
    const parsedEffects = ImageLogic.splitEffects(effects)
    // done parsing the effects, now let's try and parse what we're trying to edit
    const url = await getUrl(source)
    if (url) {
      startTyping(context)
      // now perform the edit
      const filename = await performEdit(url, parsedEffects)
      if (filename === undefined) {
        // error in performing the command, react with emote
        reactErr(context)
        return
      }
      const cubeMessageManager = container.resolve(CubeMessageManager)
      const storage = container.resolve(CubeStorage)
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
            if (msg instanceof Message) {
              await cubeMessageManager.registerTrashReact(context, msg, user.id)
              await storage.imageJobs.set(msg.id, {
                owner: user.id,
                type: 'edit',
                effects: effects,
                source: source
              })
            }
          }
        })
      }
    } else {
      console.error(`Edit failed for ${user.id} (user id) on ${source} (source url)`)
      await reactErr(context)
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

  /**
  * reacts with custom error emote defined in secrets.json
  * and log an error to the console
  * when an image fails its operation if its not a / command
  * @param context either a message or interaction
  */
  async function reactErr (context: MsgContext) {
    // TODO: add ephermal followup explaining error details
    const cubeMessageManager = container.resolve(CubeMessageManager)
    if (context instanceof CommandInteraction) {
      console.error(`Command interaction failure on channel id: ${context.channelId}, guild id: ${context.guildId}`)
      const reply = await context.editReply(`${secrets.cubemojiBroken} this operation failed!`)
      if (reply instanceof Message) {
        // allow user to delete the error message
        await cubeMessageManager.registerTrashReact(context, reply, context.user.id)
      }
    }
    if (context instanceof ContextMenuInteraction) {
      console.error(`Context menu failure on channel id: ${context.channelId}, guild id: ${context.guildId}`)
      const msg = await context.channel?.messages.fetch(context.targetId)
      if (msg) {
        msg.react(secrets.cubemojiBroken)
      }
      await context.deleteReply()
    }
    if (context instanceof MessageReaction) {
      console.error(`Message reaction failure on channel id ${context.message.channelId}, guild id: ${context.message.guildId}, message id: ${context.message.id}`)
      await (await context.fetch()).message.react(secrets.cubemojiBroken)
    }
  }

  // type to indicate that cubemoji is working on the edit/rescale
  async function startTyping (context: MsgContext) {
    if (context instanceof MessageReaction) {
      context.message.channel.sendTyping()
    }
  }
}
