// helper functions for use in command files
import FileType = require('file-type')
import got from 'got/dist/source'
import { createWriteStream } from 'fs'
import path = require('path')
import { reject } from 'p-cancelable'
import { DIService, Client } from 'discordx'
import { container } from 'tsyringe'
import { EmoteCache } from './EmoteCache'
import { randomUUID } from 'crypto'
import { promisify } from 'util'
import { pipeline } from 'stream'
import { AutocompleteInteraction, CommandInteraction, Message, MessageEmbed } from 'discord.js'
import { choice, geometricReservoirSample } from 'pandemonium'
import { Cmoji, CubeStorage, Source } from './Cubemoji'
import { Pagination } from '@discordx/utilities'

// display  a random status message
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
    const emoteCache = grabEmoteCache()
    if (emoteCache) client.user?.setActivity(`:${choice(emoteCache.emojis).name}:`, { type: 'WATCHING' })
  }
}

// return true if this is a URL w/ a valid extension, false if it isn't
export async function isUrl (url: string) {
  const urlReg = /^https?:\/\/.+/
  if (url.match(urlReg)) {
    // looks like an https url
    // now check the filetype
    const stream = await got.stream(url)
    const type = await FileType.fromStream(stream)
    const validTypes = ['jpg', 'jpeg', 'gif', 'png']

    if (type !== undefined && validTypes.includes(type.ext)) return true
    else return false
  } else return false
}

// checks a string to see if there is an emote or URL there and then returns the URL
// that we will use for edits
export async function getUrl (source: string) {
  const emoteCache = grabEmoteCache()
  // yes that's a URL we can use for editing
  if (await isUrl(source)) return source
  else if (emoteCache !== undefined) {
    // see if it's an emote
    const res = await emoteCache.retrieve(source)
    if (res === undefined) return undefined
    else return res.url
  } else return ''
}

/**
 * download an image file to the local FS under the download folder
 * @param url - link to the img
 * @param compress - optionally compress the image if its above 0.5MB
 * @returns promise for a url or undefined
 */
export async function downloadImage (url: string, compress = false) {
  // disable timeouts and limit retries with got
  const gotOptions = {
    retry: {
      limit: 1
    },
    timeout: {
      request: 10
    }
  }
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

/**
 * grab an emote cache TSyringe container or return
 * undefined if there is no container
 */
export function grabEmoteCache () {
  if (DIService.container) return container.resolve(EmoteCache)
  else return undefined
}

/**
 * grabs gcp storage from tsyringe container
 */
export function grabStorage () {
  if (DIService.container) return container.resolve(CubeStorage)
  else return undefined
}

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
 * autocomplete resolver, follows the user's
 * query and presents them with emotes that match
 * whatever they are typing
 */
export function acResolver (interaction: AutocompleteInteraction) {
  const emoteCache = grabEmoteCache()
  if (emoteCache) {
    const query = interaction.options.getFocused(true).value
    if (typeof query === 'string') {
      const res = emoteCache.search(query)
      if (res.length > 0) {
        // if we actually get some choices back we send to cubemoji
        interaction.respond(res.slice(0, 8).map(result => {
          return { name: result.item.name, value: result.item.name }
        }))
      } else {
        // otherwise we return some random emojis
        const res = geometricReservoirSample(8, emoteCache.emojis)
        interaction.respond(res.map(result => {
          return { name: result.name, value: result.name }
        }))
      }
    }
  }
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
        curEmotePage.setFooter(menuItem)
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
        curEmotePage.setFooter(menuItem)
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
