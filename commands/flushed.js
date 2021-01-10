module.exports = {
  name: 'flushed',
  description: 'Insert a random flushed emote!',
  usage: '[flushed] (optional)<# of emotes to create max: 25>',
  aliases: ['flush', 'fl', 'f', 'cubis'],
  cooldown: 2,
  requiresCache: true,
  execute (message, args, client, cache) {
    require('../helper')
    const Pand = require('pandemonium')
    let repeats = 1
    const options = cache.search('fl')
    const intVers = parseInt(args[0])
    if (args.length > 1 && !isNaN(intVers) && intVers < 26) {
      repeats = intVers
    }
    console.log('flushed command used')
    const emotes = Pand.geometricReservoirSample(repeats, options)
    let msg
    emotes.forEach(emote => msg.concat(emote))
    message.channel.send(msg)
  }
}
