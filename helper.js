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
      minMatchCharLength: 2
    }
    const search = new Fuse(this.createEmoteArray(), options)
    const results = search.search(query)
    return (results)
  }
}
