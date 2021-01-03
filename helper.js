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
    // we only want to do an update every ten minutes
    this.nextUpdateTime = moment().add(15, 'minutes')
  }

  createEmoteArray () {
    // we are just manually iterating through the map to create a list
    // ensure we only update if there is no data or the update time has lapsed
    if ((this.arrayVersion === undefined || this.arrayVersion.length === 0) ||
        (moment().isAfter(this.nextUpdateTime))) {
      console.log('emote cache updated')
      this.emoteCache = this.client.emojis.cache
      const emotes = []
      for (const [, value] of this.emoteCache) {
        emotes.push(value)
      }
      this.arrayVersion = emotes
      // only perform an update every fifteen minutes
      this.nextUpdateTime = moment().add(15, 'minutes')
    }
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
}
