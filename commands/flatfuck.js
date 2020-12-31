module.exports = {
  name: 'flatfuck',
  description: 'Is it flat fuck friday?!',
  usage: '[flatfuck]',
  aliases: ['ff', 'flat_fuck_friday', 'femboy_friday'],
  requiresCache: false,
  execute (message) {
    console.info('flat_fuck used')
    const day = new Date()
    if (day.getDay() === 4) {
      console.info('flat fuck command used')
      message.channel.send(':hahagators:')
    } else {
      message.channel.send('i am sorry but no')
    }
  }
}
