// Lots of functions that actually perform the Discord
// commands
import { Pagination } from '@discordx/pagination'
import { watch } from 'chokidar'
import { CommandInteraction, ContextMenuInteraction, Message, MessageAttachment, MessageEmbed, MessageReaction, PartialUser, User } from 'discord.js'
import { Client } from 'discordx'
import { fileTypeFromStream } from 'file-type'
import got from 'got/dist/source'
import { choice } from 'pandemonium'
import { container } from 'tsyringe'
import { URL } from 'url'
import secrets from '../../secrets.json'
import { Cmoji, Source } from './Cubemoji'
import { EmoteCache } from './EmoteCache'
import { edit, MsgContext, rescale, splitEffects } from './ImageLogic'
import { CubeMessageManager } from './MessageManager'
import { CubeStorage } from './Storage'

// display a random status message for the bot
export function setStatus (client: Client) {
  if (choice([true, false])) {
    // useful help text
    const status = choice([
      'Type /help to learn more about me!',
      'Type / in chat to use my slash commands!',
      'React 📏 to a message to rescale that message content!',
      'React 📷 to a message to randomly edit that message content!',
      'React 🌟 on a generated image to save to best of!'
    ])
    client.user?.setActivity(status, { type: 'PLAYING' })
  } else {
    // display an emote status
    const emoteCache = container.resolve(EmoteCache)
    if (emoteCache) client.user?.setActivity(`:${choice(emoteCache.emojis).name}:`, { type: 'WATCHING' })
  }
}

/**
* checks whether a url is using a proper extension
* that cubemoji supports, is not on a hostname blocklist,
* and is using https
* @param url
* @returns
*/
export async function isUrl (url: string) {
  try {
    const whatwgUrl = new URL(url)

    // only want secure connections
    if (whatwgUrl.protocol !== 'https:') return false

    // check against blocked hosts
    const storage = container.resolve(CubeStorage)
    const res = await storage.badHosts.get(whatwgUrl.hostname)
    // on the blocklist, then we don't continue
    if (res !== undefined) return false

    // now check the filetype
    const stream = await got.stream(url)
    const type = await fileTypeFromStream(stream)
    const validTypes = ['jpg', 'jpeg', 'gif', 'png']

    if (type !== undefined && validTypes.includes(type.ext)) return true
    else return false
  } catch (e) {
    console.error(e)
    return false
  }
}

// checks a string to see if there is an emote or URL there and then returns the URL
// that we will use for edits
export async function getUrl (source: string) {
  const emoteCache = container.resolve(EmoteCache)
  // yes that's a URL we can use for editing
  if (await isUrl(source)) return source
  else if (emoteCache !== undefined) {
    // see if it's an emote
    const res = await emoteCache.retrieve(source)
    if (res === undefined) return undefined
    else return res.url
  } else return ''
}

// /**
//   * grab an emote cache TSyringe container or return
//   * undefined if there is no container
//   */
// export function grabEmoteCache () {
//   if (DIService.container) return container.resolve(EmoteCache)
//   else return undefined
// }

// /**
//   * grabs gcp storage from tsyringe container
//   */
// export function grabStorage () {
//   if (DIService.container) return container.resolve(CubeGCP)
//   else return undefined
// }

/**
  * gets either a message attachment or content of a message
  * and returns that
  */
export function getMessageImage (message: Message) {
  const attach = message.attachments.random()
  if (message.attachments.size > 0 && attach) {
    return attach.url
  } else return message.content
}

/**
  * send a new pagination to the specified interaction
  */
export function sendPagination (interaction: CommandInteraction, type: Source, emoteCache: EmoteCache) {
  // first setup embeds
  const embeds: MessageEmbed[] = []
  const menuText: string[] = [] // page markers like alphabet-bean for example
  let menuItem = ''
  let embedBody = ''
  let curEmotePage = newPage(new MessageEmbed(), type)
  let emotesPerPage = 0
  let emoteSource: Cmoji[] = [] // the source of our list
  if (curEmotePage) {
    switch (type) {
      case Source.Discord:
        emoteSource = emoteCache.discEmojis
        emotesPerPage = 60
        break
      case Source.Mutant:
        emoteSource = emoteCache.mutantEmojis
        emotesPerPage = 120
        break
      case Source.Any:
        emoteSource = emoteCache.emojis
        emotesPerPage = 120
    }
    emoteSource.forEach((emote, i) => {
      // for discord emojis we want 60 emojis in one embed
      // mutant and any we can do 100 in one embed
      if (embedBody === '') {
        // beginning a new page so let's mark that
        menuItem = `(${menuText.length + 1}): ${emote.name} - `
      }
      // append to emote list
      if (type === Source.Discord && emote.guildEmoji) {
        // discord emoji specific code
        embedBody = embedBody.concat(emote.guildEmoji.toString())
      }
      if (type === Source.Any || type === Source.Mutant) {
        // just grab names for these objects
        embedBody = `${embedBody} \`${emote.name}\``
        if (type === Source.Any) {
          // append (D) for Discord (M) for Mutant
          if (emote.source === Source.Discord) embedBody = `${embedBody} (D)`
          else embedBody = `${embedBody} (M)`
        }
      }
      if (i !== 0 && (i % emotesPerPage === 0)) {
        // this is when we reach the max emotes per page
        // get the last emote that we added to the page
        // and add to menu text
        menuItem = menuItem.concat(emoteSource[i - 1].name)
        curEmotePage.setDescription(embedBody)
        curEmotePage.footer = { text: menuItem }
        // append page to embeds
        embeds.push(curEmotePage)
        menuText.push(menuItem)
        // clear working page, menu item
        curEmotePage = newPage(new MessageEmbed(), type)
        menuItem = ''
        embedBody = ''
      } else if (i === emoteSource.length - 1) {
        // if the size of the array isn't a multiple of the emotes per page
        // then we need to also end now
        menuItem = menuItem.concat(emoteSource[i - 1].name)
        curEmotePage.setDescription(embedBody)
        curEmotePage.footer = { text: menuItem }
        embeds.push(curEmotePage)
        menuText.push(menuItem)
      }
    })
    // now we send an actual pagination
    new Pagination(interaction, embeds, {
      type: 'SELECT_MENU',
      // ephemeral: true, have a feeling this is causing api errors
      pageText: menuText,
      showStartEnd: false
    }).send()
  }
}

/**
  * Initializes a new page
  */
function newPage (embed: MessageEmbed, type: Source) {
  const mutantAttr = 'This bot uses Mutant Standard emoji (https://mutant.tech) which are licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (https://creativecommons.org/licenses/by-nc-sa/4.0/)'
  switch (type) {
    case Source.Discord:
      embed.setTitle('List of Discord Emotes')
      break
    case Source.Any:
      embed.setTitle('List of All Emotes')
      embed.addField('License Info', mutantAttr)
      break
    case Source.Mutant:
      embed.setTitle('List of Mutant Emoji')
      embed.addField('License Info', mutantAttr)
  }
  embed.setColor('RANDOM')
  return embed
}

// discord logic for doing a rescale
export async function discRescale (context: MsgContext, source: string, user: User | PartialUser) {
  if (source === null) return
  const url = await getUrl(source)
  if (url) {
    startTyping(context)
    // do the rescale
    const filename = await rescale(url)
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
export async function discEdit (context: MsgContext, effects: string, source: string | null, user: User | PartialUser) {
  if (source === null) return
  const parsedEffects = splitEffects(effects)
  // done parsing the effects, now let's try and parse what we're trying to edit
  const url = await getUrl(source)
  if (url) {
    startTyping(context)
    // now perform the edit
    const filename = await edit(url, parsedEffects)
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