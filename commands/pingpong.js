module.exports = {
  name: 'pingpong',
  description: 'A good sport!',
  usage: '[pingpong]',
  aliases: ['pp', 'ping_pong'],
  cooldown: 1,
  execute (message) {
    // console.log('pingpong command used')
    message.reply('🏓')
  }
}
