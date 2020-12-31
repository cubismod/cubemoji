module.exports = {
  name: 'pong',
  description: 'Test bot pong',
  usage: '[pong]',
  aliases: ['po'],
  execute (message, args) {
    console.info('pong command used')
    message.reply('ping')
  }
}
