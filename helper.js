// helper functions
const moment = require('moment')
const Fuse = require('fuse.js')
// a class which can return an array version of emotes
// and also only refreshes when necessary
module.exports = class EmoteCache {
  constructor (client) {
    this.client = client
    this.emoteCache = client.emojis.cache
    this.arrayVersion = [] // init with an empty array
    this.sortedArray = []
    // we only want to do an update every ten minutes
    this.nextUpdateTime = moment().add(15, 'minutes')
  }

  // sortable: returns just a list of names which can be easily sorted
  createEmoteArray (sortable = false) {
    // we are just manually iterating through the map to create a list
    // ensure we only update if there is no data or the update time has lapsed
    if ((this.arrayVersion === undefined || this.arrayVersion.length === 0) ||
        (moment().isAfter(this.nextUpdateTime))) {
      this.emoteCache = this.client.emojis.cache
      this.arrayVersion = []
      this.sortedArray = []
      for (const [, value] of this.emoteCache) {
        this.arrayVersion.push(value)
        this.sortedArray.push(value.name)
      }
      this.sortedArray = this.sortedArray.sort(function (a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase())
      })
      // only perform an update every fifteen minutes
      this.nextUpdateTime = moment().add(15, 'minutes')
    }
    if (sortable) return this.sortedArray
    return this.arrayVersion
  }

  search (query) {
    const options = {
      keys: ['name'],
      useExtendedSearch: true,
      minMatchCharLength: 1,
      threshold: 0.3
    }
    const search = new Fuse(this.createEmoteArray(), options)
    const results = search.search(query)
    return (results)
  }

  // TODO: move fuzzy searching here
  // retrieves an emote based on title
  // or the user actually embedding an emote in
  // their message, then returns that emoji object
  // if cubemoji doesn't have access to the emote then we return a URL
  // to the emote image
  retrieve (emote) {
    // first convert the name to lowercase so we aren't case sensitive
    const emoteName = emote.toLowerCase()

    let res = this.client.emojis.cache.find(emote => emote.name.toLowerCase() === emoteName)
    if (!res) {
      // try and read the emote directly
      // like <:flass:781664252058533908>
      // so we take the "flass" part
      const split = emoteName.split(':')
      if (split.length > 2) {
        res = this.client.emojis.cache.find(emote => emote.name.toLowerCase() === split[1])
        if (res === undefined) {
          res = {}
          // return the url here
          res.url = 'https://cdn.discordapp.com/emojis/' + split[2]
          res.url = res.url.slice(0, res.url.length - 1) // chop off the '>'
          res.external = true
        }
      }
    }
    return res
  }

  // return the User object https://discord.js.org/#/docs/main/stable/class/User or false if no match found
  parseMention (msg, client) {
    const found = msg.match(/<@!?(\d+)>/)
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
  getAvatar (msg, client) {
    const user = this.parseMention(msg, client)
    if (user) {
      return (user.avatarURL({ format: 'png', size: 128 }))
    }
  }
}
