// emote cache and some helper functions
import Fuse = require('fuse.js')
import Twemoji = require('twemoji-parser')
import Discord = require('discord.js')
import dayjs = require('dayjs')
import { Cubemoji } from './types/cubemoji/cubemoji';

// a class which can return an array version of emotes
// and also only refreshes when necessary
export class EmoteCache {
  client: Discord.Client;
  emoteCache: Discord.Collection<Discord.Snowflake, Discord.GuildEmoji>;
  arrayVersion: Discord.GuildEmoji[];
  sortedArray: string[];
  nextUpdateTime: dayjs.Dayjs;

  constructor (client: Discord.Client) {
    this.client = client
    this.emoteCache = client.emojis.cache
    this.arrayVersion = [] // init with an empty array
    this.sortedArray = []
    // we only want to do an update every ten minutes
    this.nextUpdateTime = dayjs().add(15, 'minutes')
  }

  // sortable: returns just a list of names which can be easily sorted
  createEmoteArray (sortable = false) {
    const validNames = new Map()
    // we are just manually iterating through the map to create a list
    // ensure we only update if there is no data or the update time has lapsed
    if ((this.arrayVersion === undefined || this.arrayVersion.length === 0) ||
        (dayjs().isAfter(this.nextUpdateTime))) {
      // load up our blacklist.json file
      // note that with the require(), you need to restart app
      // for it to see changes to the file
      const blacklist = require('./blacklist.json').blacklist
      this.emoteCache = this.client.emojis.cache
      this.arrayVersion = []
      this.sortedArray = []
      for (const [, value] of this.emoteCache) {
        // utilize the blacklist.json file to remove bad emotes
        // blacklist.json utilizes emote IDs
        if (!blacklist.includes(value.id)) {
          let inc = 0
          // save the original name before we modify it
          const ogName = value.name.toLowerCase()
          // check for duplicates
          if (validNames.has(ogName)) {
            // get the increment value from the map
            inc = validNames.get(ogName) + 1
            value.name = `${value.name}_${inc}`
          }
          this.arrayVersion.push(value)
          this.sortedArray.push(value.name)
          validNames.set(ogName, inc)
        }
      }
      this.sortedArray = this.sortedArray.sort(function (a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase())
      })
      // only perform an update every fifteen minutes
      this.nextUpdateTime = dayjs().add(15, 'minutes')
    }
    if (sortable) return this.sortedArray
    return this.arrayVersion
  }

  search (query: string) {
    const options = {
      keys: ['name'],
      useExtendedSearch: true,
      minMatchCharLength: 1,
      threshold: 0.3
    }
    // performing a type assertion as we know this will always return an array of emotes
    const emotes = <Discord.GuildEmoji[]> this.createEmoteArray(false)

    const search = new Fuse.default(emotes, options)
    const results = search.search(query)
    return (results)
  }

  // TODO: move fuzzy searching here
  // retrieves an emote based on title
  // or the user actually embedding an emote in
  // their message, then returns that emoji object
  // if cubemoji doesn't have access to the emote then we return a URL
  // to the emote image
  retrieve (emote: string) {
    // first convert the name to lowercase so we aren't case sensitive
    const emoteName = emote.toLowerCase()

    let res = this.arrayVersion.find(emote => emote.name.toLowerCase() === emoteName)
    if (!res) {
      // try and read the emote directly
      // like <:flass:781664252058533908>
      // so we take the "flass" part
      const split = emoteName.split(':')
      if (split.length > 2) {
        res = this.arrayVersion.find(emote => emote.name.toLowerCase() === split[1])
        if (res === undefined) {
          let emoji: Cubemoji.Emoji = {
            url: 'https://cdn.discordapp.com/emojis/' + split[2],
            external: true
          }
          emoji.url = emoji.url.slice(0, emoji.url.length - 1) // chop off the '>'
          return emoji
        }
      }
    }
    return res
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
  getAvatar (body: string, client: Discord.Client) {
    const user = this.parseMention(body, client)
    if (user) {
      return (user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 }))
    }
  }

  // parse a twemoji and return a url
  parseTwemoji (body: string) {
    const entitites = Twemoji.parse(body, { assetType: 'png' })
    if (entitites) return entitites[0]
    else return ''
  }
}