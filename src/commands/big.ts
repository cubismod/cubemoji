import { Cubemoji } from '../types/cubemoji/cubemoji'
import Discord = require('discord.js')
import { ExtMsg } from '../extended-msg'
import { checkImage } from '../command-helper'

export class Big implements Cubemoji.Command {
  name = 'big'
  description = 'Creates a big version of an item. https://gitlab.com/cubismod/cubemoji/-/wikis/commands/big'
  usage = 'big emote|emote-name|mention|url'
  aliases = ['b', 'large', 'enhance']
  cooldown = 1

  execute (message: Discord.Message, args: string[], client: Discord.Client, util: Cubemoji.Util) {
    const extMsg = new ExtMsg(message)
    if (args.length < 1) {
      console.log(`${message.author.username} failed to use ${this.name} correctly`)
      extMsg.inlineReply(`You must specify an emote in the command!\n \`${this.usage}\``)
    } else {
      checkImage(message, client, util).then(url => {
        if (url !== '') extMsg.channel.send(url)
        extMsg.inlineReply('unable to find what you sent')
      })
    }
  }
}
