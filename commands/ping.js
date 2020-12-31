module.exports = {
  name: 'ping',
  description: 'Test bot ping',
  usage: '[ping]',
  aliases: ['pi'],
  execute (message, args) {
    message.reply('pong')
  }
}
