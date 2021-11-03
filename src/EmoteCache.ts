/* eslint-disable new-cap */
// emote cache and some helper functions
import Twemoji = require('twemoji-parser')
import { Client, Discord } from 'discordx'
import { inject, injectable } from 'tsyringe'
import { Cmoji, Source } from './Cubemoji'
import mutantNames from './res/emojiNames.json'
import got from 'got/dist/source'
import Fuse from 'fuse.js'
import { GuildEmoji } from 'discord.js'

@Discord()
@injectable()
// a class which can return an array version of emotes
// and also only refreshes when necessary
export class EmoteCache {
  client: Client
  emojis: Cmoji[]
  sortedArray: string[] // sorted list of emoji names
  discEmojis: Cmoji[] // save references to discord emojis for functions that wouldn't work well w/ images
  mutantEmojis: Cmoji[] // references to mutant emojis
  nextListDelete: number // for List.ts

  constructor (@inject('Client') client: Client) {
    this.client = client
    this.emojis = []
    this.sortedArray = [] // sorted list of emoji names
    this.discEmojis = []
    this.mutantEmojis = []
    this.nextListDelete = 0
  }

  /**
   * initializes the class by copying the client emoji list,
   * performing de-duplication of emote names, extracting
   * emojis into separate list, and sorting the main list
   */
  async init () {
    // setup emoji cache and fix duplicate names
    this.emojis = await this.grabEmotes()
    this.deduper()
    this.extractEmojis()
    this.sortArray()
  }

  /**
   * copies discord client emojis as well as adds Mutant emojis
   * @returns list of all emojis
   */
  private async grabEmotes () {
    const emojis: Cmoji[] = []
    await this.client.guilds.fetch()
    // add discord emojis
    this.client.guilds.cache.forEach(guild => {
      for (const emoji of guild.emojis.cache.values()) {
        emojis.push(new Cmoji(emoji.name, emoji.url, Source.Discord, emoji, emoji.id))
      }
    })
    // then add mutant emojis
    mutantNames.forEach(emoji => {
      const url = `https://storage.googleapis.com/cubemoji.appspot.com/mutant-emotes/${emoji}`
      // remove the file extension
      const name = emoji.slice(0, -4)
      emojis.push(new Cmoji(name, url, Source.Mutant, null))
    })
    return emojis
  }

  /**
 * Adds an emote to the list, does not perform sorting
 * @param emote the emote to add
 */
  async addEmote (emote: GuildEmoji) {
    console.log(`new emoji registered: ${emote.name}`)
    this.emojis.push(new Cmoji(emote.name, emote.url, Source.Discord, emote, emote.id))
  }

  /**
   * removes an emote from the list,
   * checks using the emoji's ID
   * @param emote emote that you want to remove
   */
  async removeEmote (emote: GuildEmoji) {
    const res = this.search(emote.id)
    if (res.length > 0 && res[0].item.id === emote.id) {
      this.emojis.splice(res[0].refIndex, 1)
      console.log(`emoij removed: ${emote.name}`)
    }
  }

  /**
 * edit an emoji by removing the old one and adding a new one
 * again, does this using emote ids
 * @param oldEmote emote to remove
 * @param newEmote emote to add
 */
  async editEmote (oldEmote: GuildEmoji, newEmote: GuildEmoji) {
    // just remove and add!
    await this.removeEmote(oldEmote)
    await this.addEmote(newEmote)
  }

  /**
   * searches the emote cache for a match
   * @param query search either by name or emote id
   * @returns a list of results
   */
  search (query: string) {
    const options = {
      keys: ['name', 'id'],
      useExtendedSearch: true,
      minMatchCharLength: 1,
      threshold: 0.3
    }

    const search = new Fuse(this.emojis, options)
    return (search.search(query))
  }

  /**
 * search limited only to Discord emoji
 * @param query emoji name or id
 * @returns a list of results
 */
  searchDiscord (query: string) {
    const options = {
      keys: ['name'],
      useExtendedSearch: true,
      minMatchCharLength: 1,
      threshold: 0.3
    }
    const search = new Fuse(this.discEmojis, options)
    return (search.search(query))
  }

  /**
   * returns an emote based on name or if the user sent an
   * emote object in their message, we return that emote object
   * if it is a nitro emote then we return a URL to the emote image
   * @param identifier an emote name or message content
   * @returns a Cmoji or nothing if we can't find an emote
   */
  async retrieve (identifier: string) {
    // discord emojis are represented in text
    // like <:flass:781664252058533908>
    // so we split to get the components including name and ID
    const split = identifier.slice(1, -1).split(':')
    // search by ID or name w/ fuse's extended syntax https://fusejs.io/examples.html#extended-search
    if (split.length > 2) identifier = `${split[2]}|${split[1]}`
    const searchResults = await this.search(identifier)
    // want an exact match
    if (searchResults.length > 0 && searchResults[0].item.id === split[2]) return searchResults[0].item
    // now we see if we have a nitro emote cubemoji doesn't have in its guilds
    if (split.length > 2) {
      const url = `https://cdn.discordapp.com/emojis/${split[2]}`
      // see if the URL will resolve
      try {
        await got(url)
        // success
        return new Cmoji(split[1], url, Source.URL, null)
      } catch {
        // don't do anything on error, means that this is not a nitro emote
      }
    }
    // try to parse a twemoji
    const twemoji = this.parseTwemoji(identifier)
    if (twemoji !== '') return new Cmoji(identifier, twemoji, Source.URL, null)
    // last resort, return a similar emoji
    if (searchResults.length > 0) return searchResults[0].item
    return undefined // nothing found at all
  }

  /**
   * for parsing a twemoji
   * @param body message body
   * @returns url
   */
  parseTwemoji (body: string) {
    const entitites = Twemoji.parse(body, { assetType: 'png' })
    if (entitites.length !== 0) return entitites[0].url
    else return ''
  }

  /**
 * iterates through emojis and ensures they each have a unique name
 */
  deduper () {
    // keep track of each name and the increments on it
    const names = new Map<string, number>()
    this.emojis.forEach((emoji, index) => {
      let inc: number | undefined = 0
      if (emoji.name && names.has(emoji.name.toLowerCase())) {
        // perform a name change
        inc = names.get(emoji.name.toLowerCase())
        if (inc !== undefined) {
          ++inc
          // save reference to original name
          const ogName = emoji.name
          this.emojis[index].name = `${emoji.name}_${inc}`
          names.set(ogName.toLowerCase(), inc)
        }
      } else if (emoji.name) {
        names.set(emoji.name.toLowerCase(), inc)
      }
    })
  }

  /**
   * extracts Mutant and Discord emojis
   * and places each into their own sorted arrays
   */
  extractEmojis () {
    const discord: Cmoji[] = []
    const mutant: Cmoji[] = []
    this.emojis.forEach(emoji => {
      switch (emoji.source) {
        case (Source.Discord):
          discord.push(emoji)
          break
        case (Source.Mutant):
          mutant.push(emoji)
          break
      }
    })
    // now sort each array
    // on name values
    this.discEmojis = discord.sort((a, b) => a.name.localeCompare(b.name))
    this.mutantEmojis = mutant.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * sorts the emoji array in place
   */
  sortArray () {
    this.emojis = this.emojis.sort((a, b) => a.name.localeCompare(b.name))
  }
}
