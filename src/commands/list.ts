import { Cubemoji } from '../types/cubemoji/cubemoji'
import Discord = require('discord.js')

export class List implements Cubemoji.Command {
  name = 'list'
  description = 'List available emotes in a DM. https://gitlab.com/cubismod/cubemoji/-/wikis/commands/list'
  usage = 'list'
  aliases = ['l', 'ls']
  cooldown = 120

  execute (message: Discord.Message, args: string[], client: Discord.Client, util: Cubemoji.Util) {
    const msg: string[] = []
    const emoteArray = util.cache.createEmoteArray(true)
    let letter = ''
    emoteArray.forEach(emote => {
      if (typeof emote === 'string') {
        // linebreak by alphabetical letters
        if ((emote[0]).toUpperCase() !== letter) {
          letter = emote[0].toUpperCase()
          msg.push(`\n${letter}:`)
        }
        msg.push(`\`${emote}\``)
      }
    })
    const msgStr = msg.join(' ')
    message.channel.send("I'm sending you a DM with the list of emotes! If you didn't get it then check your privacy settings on Discord.")
    message.author.send(`**Emote List**\nType \`c!emote <emote_name>\` in this chat to see a specific emote)\nType \`c!info <emote_name>\` for more info about a specific emote\n${msgStr}\n`, { split: { char: ' ' } })
  }
}
