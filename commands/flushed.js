module.exports = {
  name: 'flushed',
  description: 'Insert a random flushed emote!',
  usage: 'flushed (optional)<# of emotes to create, max: 25> https://gitlab.com/cubismod/cubemoji/-/wikis/commands/flushed',
  aliases: ['flush', 'fl', 'f', 'cubis'],
  cooldown: 2,
  execute (message, args, _client, helper) {
    require('../helper')
    const Pand = require('pandemonium')
    let repeats = 1
    const options = helper.cache.search('fl')
    const intVers = parseInt(args[0])
    if (args.length > 0 && !isNaN(intVers) && intVers < 26) repeats = intVers
    // safely fail by just returning 1 emote
    const emotes = Pand.geometricReservoirSample(repeats, options)
    let msg = ''
    emotes.forEach(emote => {
      msg = msg.concat(emote.item)
    })
    message.channel.send(msg)
  }
}
