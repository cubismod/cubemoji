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
import { Cmoji, Source } from './Cubemoji'
import { Pagination } from '@discordx/utilities'

// display  a random status message
export function setStatus (client: Client) {
  const status = choice([
    'Type / in chat to use my slash commands!',
    'React 📏 to a message to rescale that message content!',
    'React 📷 to a message to randomly edit that message content!',
    'React 🌟 on a generated image to save to best of!'
  ])
  client.user?.setActivity(status, { type: 'PLAYING' })
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
 * @returns promise for a url or undefined
 */
export async function downloadImage (url: string) {
  // check first whether the file isn't too big
  const headers = await got.head(url)
  if (headers.headers['content-length'] && parseInt(headers.headers['content-length']) < 2e+6) {
    // limit to 2mb download
    const fn = path.resolve(`download/${randomUUID()}`)
    const pl = promisify(pipeline)
    await pl(
      got.stream(url, {
        retry: {
          limit: 0
        },
        timeout: {
          request: 500
        }
      })
        .on('error', (error: Error) => {
          console.error(error.message)
        }),
      createWriteStream(fn).on('error', (error: Error) => { reject(error) })
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
        emotesPerPage = 100
        break
      case Source.Any:
        emoteSource = emoteCache.emojis
        emotesPerPage = 100
    }
    emoteSource.forEach((emote, i) => {
      // for discord emojis we want 60 emojis in one embed
      // mutant and any we can do 100 in one embed
      if (embedBody === '') {
        // beginning a new page so let's mark that
        menuItem = `${emote.name} -`
      }
      // append to emote list
      if (type === Source.Discord && emote.guildEmoji) {
        // discord emoji specific code
        embedBody = embedBody.concat(emote.guildEmoji.toString())
      }
      if (type === Source.Any || type === Source.Mutant) {
        // just grab names for these objects
        embedBody = `${embedBody}, \`${emote.name}\``
      }
      if (i !== 0 && (i % emotesPerPage)) {
        // this is when we reach the max emotes per page
        // get the last emote that we added to the page
        // and add to menu text
        menuItem = menuItem.concat(emoteSource[i - 1].name)
        curEmotePage.setDescription(embedBody)
        // append page to embeds
        embeds.push(curEmotePage)
        menuText.push(menuItem)
        // clear working page and menu item
        curEmotePage = newPage(new MessageEmbed(), type)
      } else if (i === emoteSource.length - 1) {
        // if the size of the array isn't a multiple of the emotes per page
        // then we need to also end now
        menuItem = menuItem.concat(emoteSource[i - 1].name)
        curEmotePage.setDescription(embedBody)
        embeds.push(curEmotePage)
        menuText.push(menuItem)
      }
    })
    // now we send an actual pagination
    new Pagination(interaction, embeds, {
      type: 'SELECT_MENU',
      ephemeral: true,
      pageText: menuText
    }).send()
  }
}

/**
 * Initializes a new page
 */
function newPage (embed: MessageEmbed, type: Source) {
  switch (type) {
    case Source.Discord:
      embed.setTitle('List of Discord Emotes')
      break
    case Source.Any:
      embed.setTitle('List of All Emotes')
      break
    case Source.Mutant:
      embed.setTitle('List of Mutant Emoji')
      embed.setFooter('This bot uses Mutant Standard emoji (https://mutant.tech) which are licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (https://creativecommons.org/licenses/by-nc-sa/4.0/)')
  }
  embed.setColor('RANDOM')
  return embed
}
