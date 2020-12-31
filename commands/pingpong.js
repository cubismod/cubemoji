module.exports = {
  name: 'pingpong',
  description: 'A good sport!',
  usage: '[pingpong]',
  aliases: ['pp'],
  execute (message, args) {
    console.info('pingpong command used')
    message.reply('🏓')
  }
}
