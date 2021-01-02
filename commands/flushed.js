module.exports = {
  name: 'flushed',
  description: 'Insert a random flushed emote!',
  usage: '[flushed] (optional)[number of emotes to create max: 15]',
  aliases: ['flush', 'fl', 'f', 'cubis'],
  requiresCache: true,
  execute (message, args, client, cache) {
    require('../helper')
    const Pandemonium = require('pandemonium')
    let repeats = 1
    const options = cache.search('fl')
    const intVers = parseInt(args[0])
    if (args.length > 0 && !isNaN(intVers) && intVers < 16) {
      repeats = intVers
    }
    console.log('flushed command used')
    const chance = Pandemonium
    let msg = ''
    for (let i = 0; i < repeats; i++) {
      msg = msg.concat(chance.choice(options).item.toString())
    }
    message.channel.send(msg)
  }
}
