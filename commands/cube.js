module.exports = {
  name: 'cube',
  description: 'Create a random cube to shuffle emotes!',
  usage: '[cube]',
  aliases: ['rc'],
  cooldown: 60,
  requiresCache: true,
  execute (message, args, client, cache) {
    require('../helper')
    const Pandemonium = require('pandemonium')
    console.log('cube command used')
    const chance = Pandemonium
    const emoteArray = cache.createEmoteArray()
    const msg = message.channel.send(chance.choice(emoteArray).toString())
    // add the react
    msg.then(message => message.react('🎲'))
  }
}
