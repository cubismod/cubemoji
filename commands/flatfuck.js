module.exports = {
  name: 'flatfuck',
  description: 'Is it flat fuck friday?! https://gitlab.com/cubismod/cubemoji/-/wikis/commands/flatfuck',
  usage: 'flatfuck',
  aliases: ['ff', 'flat_fuck_friday', 'femboy_friday', 'femboy', 'flat', 'flat_fuck', 'fff', 'femboyfriday'],
  cooldown: 60,
  execute (message) {
    const Pandemonium = require('pandemonium')
    const chance = Pandemonium
    const contentOptions = [
      'https://www.youtube.com/watch?v=A5U8ypHq3BU',
      'https://www.youtube.com/watch?v=H0b3moDYTUA',
      'https://www.youtube.com/watch?v=NRn8coFCIjU',
      'https://youtu.be/MLESXo2YINY',
      'https://youtu.be/LBAj4ADIxNM',
      'https://youtu.be/SSp8NcxPE24',
      'https://youtu.be/NDse0v849cc',
      'https://youtu.be/i359iZI3QlE',
      'https://youtu.be/dXE0E3w71oM'
    ]
    const day = new Date()
    if (day.getDay() === 5) {
      message.channel.send('<:hahaflatfuck:769663194729414656>')
      message.channel.send(chance.choice(contentOptions))
    } else {
      message.channel.send('sorry no, it is not flat fuck friday, nor is it femboy friday, nor is it flushed friday, nor is it flat fluck femboy flushed friday 😳')
    }
  }
}
