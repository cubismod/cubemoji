module.exports = {
  name: 'cube',
  description: 'Create a random cube to shuffle emotes!',
  usage: '[cube]',
  aliases: ['c'],
  cooldown: 60,
  execute (message, args, client, helper) {
    require('../helper')
    const Pandemonium = require('pandemonium')
    const chance = Pandemonium
    const emoteArray = helper.cache.createEmoteArray()
    const msg = message.channel.send(chance.choice(emoteArray).toString())
    // add the react
    msg.then(message => message.react('🎲'))
  }
}
