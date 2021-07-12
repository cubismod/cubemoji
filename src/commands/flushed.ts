import Discord = require('discord.js')
import { Cubemoji } from '../types/cubemoji/cubemoji'
import Pandemonium = require('pandemonium')

export class flushed implements Cubemoji.Command {
  name = 'flushed'
  description = 'Insert a random flushed emote! https://gitlab.com/cubismod/cubemoji/-/wikis/commands/flushed'
  usage = 'flushed opt_num_emotes_to_include_1->25'
  aliases = ['flush', 'fl', 'f', 'cubis']
  cooldown = 2
  execute (message: Discord.Message, args: string[], client: Discord.Client, util: Cubemoji.Util) {
    let repeats = 1
    const options = util.cache.search('fl')
    const intVers = parseInt(args[0])
    if (args.length > 0 && !isNaN(intVers) && intVers < 26) repeats = intVers
    // safely fail by just returning 1 emote
    const emotes = Pandemonium.geometricReservoirSample(repeats, options)
    let msg = ''
    emotes.forEach(emote => {
      // not sure if this will work
      msg = msg.concat(emote.item.toString())
    })
    message.channel.send(msg)
  }
}
