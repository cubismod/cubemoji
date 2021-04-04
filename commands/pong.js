require('./../extended-msg')
module.exports = {
  name: 'pong',
  description: 'Test bot pong',
  usage: '[pong]',
  aliases: ['po'],
  cooldown: 1,
  execute (message) { message.inlineReply('ping') }
}
