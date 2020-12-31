module.exports = {
  name: 'pong',
  description: 'Test bot pong',
  usage: '[pong]',
  aliases: ['po'],
  execute (message, args) {
    console.log('pong command used')
    message.reply('ping')
  }
}
