module.exports = {
  name: 'stuff',
  description: '...',
  usage: '[stuff]',
  aliases: ['st', 'stuffed', 'stuffee'],
  requiresCache: false,
  execute (message) {
    console.log('stuff command used')
    message.channel.send('😳')
  }
}
