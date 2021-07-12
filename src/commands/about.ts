import Discord = require('discord.js')
import { Cubemoji } from '../types/cubemoji/cubemoji'
import dayjs = require('dayjs')
import pkg = require('../../package.json')

export class About implements Cubemoji.Command {
  name = 'About'
  description = 'Provides information and stats about the bot. https://gitlab.com/cubismod/cubemoji/-/wikis/commands/about'
  usage = 'about'
  aliases = ['a']
  cooldown = 5

  execute (message: Discord.Message, _args: string[], client: Discord.Client) {
    const embed = {
      title: '<:cubemoji:793663899072200744>',
      color: 0x91d7f2,
      author: {
        name: 'Created by cubis'
      },
      description: 'a simple emoji bot built to last ⌛',
      fields: [
        {
          name: 'GitLab',
          value: 'https://gitlab.com/cubismod/cubemoji'
        },
        {
          name: 'Version',
          value: `${pkg.version}`
        },
        {
          name: 'License',
          value: `${pkg.license}`
        },
        {
          name: 'Stats',
          value: `Current Emote Count: ${client.emojis.cache.size}\nUptime: ${dayjs().to(client.readyAt, true)}\nServers: ${client.guilds.cache.size}`
        },
        {
          name: 'Discord',
          value: 'https://discord.gg/Y59XVpx'
        },
        {
          name: 'Bugs and Feature Requests',
          value: 'https://gitlab.com/cubismod/cubemoji/-/issues'
        }
      ]
    }
    message.channel.send({ embed: embed })
  }
}
