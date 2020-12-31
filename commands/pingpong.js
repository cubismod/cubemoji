module.exports = {
  name: 'pingpong',
  description: 'A good sport!',
  usage: '[pingpong]',
  aliases: ['pp'],
  execute (message, args) {
    console.log('pingpong command used')
    message.reply('🏓')
  }
}
