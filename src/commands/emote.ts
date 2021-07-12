import { Cubemoji } from '../types/cubemoji/cubemoji'
import Discord = require('discord.js')
import { ExtMsg } from '../extended-msg'

export class Emote implements Cubemoji.Command {
  name = 'emote'
  description = 'Inserts an emote into chat. https://gitlab.com/cubismod/cubemoji/-/wikis/commands/emote'
  usage = 'emote emoji_name '
  aliases = ['emoji', 'e']
  cooldown = 1
  execute (message: Discord.Message, args: string[], util: Cubemoji.Util) {
    const extMsg = new ExtMsg(message)
    if (args.length < 1) {
      console.log(`${message.author.username} failed to use ${this.name} correctly`)
      extMsg.inlineReply('You must specify an emote in the command!')
    } else {
      // emoji names are only one word long so we will only consider the 0th element
      // also doing case insensitive searching
      const emoteName = args[0].toLowerCase()
      const res = util.cache.retrieve(emoteName)
      if (res && !('external' in res)) {
        // ensure we're not sending external emotes
        message.channel.send(res.toString())
      } else {
        // retrieve a result from the cache
        const res2 = util.cache.search(args[0])
        if (res2.length > 0) {
          message.channel.send(res2[0].item.toString())
        } else {
          console.log(`${message.author.username} failed to find emote ${emoteName}`)
          extMsg.inlineReply('emote not found!')
        }
      }
    }
  }
}
