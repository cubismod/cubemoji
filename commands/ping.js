require('./../extended-msg')
const embeds = require('../embeds')
module.exports = {
  name: 'ping',
  description: 'Test bot ping',
  usage: '[ping]',
  aliases: ['pi'],
  cooldown: 1,
  execute (message) {
    message.channel.send({ embed: embeds.errorEmbed(0, 'this is informational alert', 'blah blah blah') })
    message.channel.send({ embed: embeds.errorEmbed(1, 'this is a warning', 'warn warn warn') })
    message.channel.send({ embed: embeds.errorEmbed(2, 'this is an error', 'error error error') })
  }
}
