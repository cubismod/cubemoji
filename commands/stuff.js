module.exports = {
  name: 'stuff',
  description: '...',
  usage: '[stuff]',
  aliases: ['st', 'stuffed', 'stuffee'],
  cooldown: 1,
  execute (message) {
    // console.log('stuff command used')
    message.channel.send('😳')
  }
}
