const emote = require('./emote')

module.exports = {
  name: 'random',
  description: 'Insert a random emote!',
  usage: '[random]',
  aliases: ['r', 'rnd'],
  requiresCache: true,
  execute (message, args, client, cache) {
    require('../helper')
    const Pandemonium = require('pandemonium')
    console.log('random command used')
    const chance = Pandemonium
    message.channel.send(chance.choice(cache.createEmoteArray()).toString())
  }
}