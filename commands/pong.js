module.exports = {
  name: 'pong',
  description: 'Test bot pong',
  usage: '[pong]',
  aliases: ['po'],
  cooldown: 1,
  execute (message) {
    console.log('pong command used')
    message.reply('ping')
  }
}
