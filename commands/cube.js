const embeds = require('../embeds')
module.exports = {
  name: 'cube',
  description: 'Creates a cube message in chat which you can shuffle by reacting to it. https://gitlab.com/cubismod/cubemoji/-/wikis/commands/cube',
  usage: 'cube',
  aliases: ['cb'],
  cooldown: 60,
  execute (message, _args, _client, helper) {
    require('../helper')
    const Pandemonium = require('pandemonium')
    const chance = Pandemonium
    const emoteArray = helper.cache.createEmoteArray()
    const msg = message.channel.send(chance.choice(emoteArray).toString())
    // add the react
    msg.then(message => message.react('🎲'))
      .catch(err => {
        message.channel.send({ embed: embeds.errorEmbed(2, 'Could not grab the message after it was sent', err) })
      })
  }
}
