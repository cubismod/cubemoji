/* eslint-disable new-cap */
// emote cache and some helper functions
import Fuse = require('fuse.js')
import Twemoji = require('twemoji-parser')
import Discord = require('discordx')
import dayjs = require('dayjs')
import { Cmoji, Source } from './Cubemoji'

// a class which can return an array version of emotes
// and also only refreshes when necessary
export class EmoteCache {
  client: Discord.Client
  emojis: Cmoji[]
  sortedArray: string[]
  nextUpdateTime: dayjs.Dayjs;

  constructor (client: Discord.Client) {
    this.client = client
    this.emojis = []
    this.sortedArray = []
    // we only want to do an update every ten minutes
    this.nextUpdateTime = dayjs().add(15, 'minutes')
  }

  async init () {
    this.emojis = await this.grabEmojis()
    this.sortedArray = await this.sortedTxtEmoteArray()
  }

  private async grabEmojis () {
    const emojis: Cmoji[] = []
    await this.client.guilds.fetch()
    this.client.guilds.cache.forEach(guild => {
      for (const emoji of guild.emojis.cache.values()) {
        emojis.push(new Cmoji(emoji.name, emoji.url, Source.Discord, emoji))
      }
    })
    return emojis
  }

  // grab emotes from the heavens and return them as well as update the state of this class
  async emoteArray () {
    const _emojis: Cmoji[] = []
    const validNames = new Map()
    // we are just manually iterating through the map to create a list
    // ensure we only update if there is no data or the update time has lapsed
    if ((this.emojis.length === 0) ||
        (dayjs().isAfter(this.nextUpdateTime))) {
      // load up our blacklist.json file
      // note that with the require(), you need to restart app
      // for it to see changes to the file
      const blacklist = require('./blacklist.json').blacklist
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
      this.nextUpdateTime = dayjs().add(15, 'minutes')
      // only perform an update every fifteen minutes
      this.emojis = _emojis
    }
    return _emojis
  }

  // much easier to work with for certain applications in cubemoji
  // just the emoji names sorted alphabetically
  // updates state of the class
  async sortedTxtEmoteArray () {
    this.emojis = await this.emoteArray()
    const txtVers = this.emojis.map(cmoji => cmoji.name)
    txtVers.sort()
    return txtVers
  }

  search (query: string) {
    const options = {
      keys: ['name'],
      useExtendedSearch: true,
      minMatchCharLength: 1,
      threshold: 0.3
    }

    const search = new Fuse.default(this.emojis, options)
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
    let res = this.emojis.find(emote => {
      // need to watch out for null emote names
      if (emote.name != null) return emote.name.toLowerCase() === emoteName
      return false
    })
    if (!res) {
      // try and read the emote directly
      // like <:flass:781664252058533908>
      // so we take the "flass" part
      const split = emoteName.split(':')
      if (split.length > 2) {
        res = this.emojis.find(emote => {
          if (emote.name != null) return emote.name.toLowerCase() === split[1]
          return false
        })
        if (res === undefined) {
          const emoji = new Cmoji(split[1], 'https://cdn.discordapp.com/emojis/' + split[2], Source.URL)
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
    if (entitites) return entitites[0].url
    else return ''
  }
}
