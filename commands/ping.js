module.exports = {
  name: 'ping',
  description: 'Test bot ping',
  usage: '[ping]',
  aliases: ['pi'],
  cooldown: 1,
  execute (message) { message.reply('pong') }
}
