module.exports = {
  name: 'random',
  description: 'Insert a random emote!',
  usage: 'random (optional)<number of emotes to create, max of 50>',
  aliases: ['r', 'rnd', 'rand'],
  cooldown: 2,
  execute (message, args, client, helper) {
    const Pandemonium = require('pandemonium')
    let repeats = 1
    const intVers = parseInt(args[0])
    if (args.length > 0 && !isNaN(intVers) && intVers < 51) {
      repeats = intVers
    }
    const chance = Pandemonium
    let msg = ''
    const emoteArray = helper.cache.createEmoteArray()
    for (let i = 0; i < repeats; i++) {
      msg = msg.concat(chance.choice(emoteArray).toString())
    }
    message.channel.send(msg)
  }
}
