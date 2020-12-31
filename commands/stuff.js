module.exports = {
  name: 'stuff',
  description: '...',
  usage: '[stuff]',
  aliases: ['st', 'stuffed', 'stuffee'],
  requiresCache: false,
  execute (message) {
    message.channel.send('😳')
  }
}
