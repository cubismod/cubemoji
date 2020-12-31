module.exports = {
  name: 'ping',
  description: 'Test bot ping',
  usage: '[ping]',
  aliases: ['pi'],
  execute (message, args) {
    console.info('ping command used')
    message.reply('pong')
  }
}
