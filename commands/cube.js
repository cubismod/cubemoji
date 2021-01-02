module.exports = {
  name: 'cube',
  description: 'Create a random cube to shuffle emotes!',
  usage: '[cube]',
  aliases: ['rc'],
  requiresCache: true,
  execute (message, args, client, cache) {
    require('../helper')
    const Pandemonium = require('pandemonium')
    console.log('rando_cube command used')
    const chance = Pandemonium
    const emoteArray = cache.createEmoteArray()
    const msg = message.channel.send(chance.choice(emoteArray).toString())
    // add the react
    msg.then(message => message.react('🎲'))
  }
}
