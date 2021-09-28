/* eslint-disable new-cap */
// emote cache and some helper functions
import Twemoji = require('twemoji-parser')
import Discord = require('discordx')
import { Cmoji, Source } from './Cubemoji'
import mutantNames from './res/emojiNames.json'
import got from 'got/dist/source'
import Fuse from 'fuse.js'

// a class which can return an array version of emotes
// and also only refreshes when necessary
export class EmoteCache {
  client: Discord.Client
  emojis: Cmoji[]
  sortedArray: string[]

  constructor (client: Discord.Client) {
    this.client = client
    this.emojis = []
    this.sortedArray = []
  }

  async init () {
    this.emojis = await this.grabEmojis()
    this.sortedArray = await this.sortedTxtEmoteArray()
  }

  private async grabEmojis () {
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
      const name = emoji.slice(0, -4)
      emojis.push(new Cmoji(name, url, Source.Mutant, null))
    })
    return emojis
  }

  // grab emotes from the heavens and return them as well as update the state of this class
  async emoteArray () {
    const _emojis: Cmoji[] = []
    const validNames = new Map()
    const blacklist = require('./blacklist.json').blacklist
    if (this.emojis.length === 0) {
      // only initialize emotes at launch
      const rawEmojis = await this.grabEmojis()
      rawEmojis.forEach(value => {
        // utilize the blacklist.json file to remove bad emotes
        // blacklist.json utilizes emote IDs
        if (value.guildEmoji != null && !blacklist.includes(value.guildEmoji.id)) {
          let inc = 0
          // save the original name before we modify it
          const ogName = value.name.toLowerCase()
          // check for duplicates
          if (validNames.has(ogName)) {
            // get the increment value from the map
            inc = validNames.get(ogName) + 1
            value.name = `${value.name}_${inc}`
          }
          _emojis.push(value)
          validNames.set(ogName, inc)
        }
      })
      this.emojis = _emojis
    }
    return _emojis
  }

  // much easier to work with for certain applications in cubemoji
  // just the emoji names sorted alphabetically
  async sortedTxtEmoteArray () {
    const txtVers = this.emojis.map(cmoji => cmoji.name)
    txtVers.sort()
    return txtVers
  }

  search (query: string) {
    const options = {
      keys: ['name', 'id'],
      useExtendedSearch: true,
      minMatchCharLength: 1,
      threshold: 0.3
    }

    const search = new Fuse(this.emojis, options)
    const results = search.search(query)
    return (results)
  }

  // retrieves an emote based on title
  // or the user actually embedding an emote in
  // their message, then returns that emoji object
  // if cubemoji doesn't have access to the emote then we return a URL
  // to the emote image
  async retrieve (emote: string) {
    // first convert the name to lowercase so we aren't case sensitive
    const emoteName = emote.toLowerCase()
    // try and see if its a nitro emote that we can just grab the URL for
    // try and read the emote directly
    // like <:flass:781664252058533908>
    // so we take the "flass" part
    const split = emoteName.slice(1, -1).split(':')
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
    // if that doesn't work, we do a fuzzy search that should pull an emote
    const searchResults = await this.search(emoteName)
    if (searchResults.length > 0) return searchResults[0].item
    // try to parse a twemoji
    const twemoji = this.parseTwemoji(emote)
    if (twemoji !== '') return new Cmoji(emoteName, twemoji, Source.URL, null)
    // failure, nothing found at all
    else return false
  }

  // return the User object https://discord.js.org/#/docs/main/stable/class/User or false if no match found
  parseMention (body: string, client: Discord.Client) {
    const found = body.match(/<@!?(\d+)>/)
    if (found) {
      // https://discord.js.org/#/docs/collection/master/class/Collection?scrollTo=get
      // returns a nice undefined
      const user = client.users.cache.get(found[1])
      if (undefined) return false
      else return user
    }
    return false
  }

  // given an argument in the form of <@86890631690977280> or <!@86890631690977280>
  // this returns the URL of that avatar or null
  getAvatar (body: string) {
    const user = this.parseMention(body, this.client)
    if (user) {
      return (user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 }))
    }
  }

  // parse a twemoji and return a url
  parseTwemoji (body: string) {
    const entitites = Twemoji.parse(body, { assetType: 'png' })
    if (entitites.length !== 0) return entitites[0].url
    else return ''
  }
}
