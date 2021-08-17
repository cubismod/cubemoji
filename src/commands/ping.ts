import { Cubemoji } from '../types/cubemoji/cubemoji'
import Discord = require('discord.js')
import { ExtMsg } from '../extended-msg'
require('./../extended-msg')

export class Ping implements Cubemoji.Command {
  name = 'ping'
  description = 'Test bot ping'
  usage = '[ping]'
  aliases = ['pi']
  cooldown = 1

  execute (message: Discord.Message, args: string[], client: Discord.Client, util: Cubemoji.Util) {
    const extMsg = new ExtMsg(message)
    extMsg.inlineReply('pong')
  }
}
