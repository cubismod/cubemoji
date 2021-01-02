module.exports = {
  name: 'random',
  description: 'Insert a random emote!',
  usage: '[random] (optional)[number of emotes to create max: 15]',
  aliases: ['r', 'rnd', 'rand'],
  requiresCache: true,
  execute (message, args, client, cache) {
    require('../helper')
    const Pandemonium = require('pandemonium')
    let repeats = 1
    const intVers = parseInt(args[0])
    if (args.length > 0 && !isNaN(intVers) && intVers < 16) {
      repeats = intVers
    }
    console.log('random command used')
    const chance = Pandemonium
    let msg = ''
    const emoteArray = cache.createEmoteArray()
    for (let i = 0; i < repeats; i++) {
      msg = msg.concat(chance.choice(emoteArray).toString())
    }
    message.channel.send(msg)
  }
}
