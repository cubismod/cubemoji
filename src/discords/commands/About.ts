import { CommandInteraction, MessageEmbed } from 'discord.js'
import { Discord, Slash } from 'discordx'
import { Companion } from '../../Cubemoji'
import pkg = require('../../../package.json')
import dayjs = require('dayjs')
import relativeTime = require('dayjs/plugin/relativeTime')

dayjs.extend(relativeTime)

@Discord()
export abstract class About {
  @Slash('about', {
    description: 'Provides information and stats about the bot.'
  })
  async about (interaction: CommandInteraction) {
    const companion : Companion = globalThis.companion
    const embed = new MessageEmbed()
    embed.setTitle('Cubemoji')
    embed.setThumbnail('https://gitlab.com/cubismod/cubemoji/-/raw/master/assets/icon.png')
    embed.setColor(0x91d7f2)
    embed.setAuthor('Created by cubis', 'https://cdn.discordapp.com/avatars/170358606590377984/5770bf2a10f9a5c3941d4e07b34c218d.png')
    embed.setDescription('a simple emoji bot built to last ⌛')

    embed.addFields([
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
        value: `Current Emote Count: ${companion.cache.emojis.length}\nUptime: ${dayjs().to(interaction.client.readyAt, true)}\nServers: ${interaction.client.guilds.cache.size}`
      },
      {
        name: 'Discord',
        value: 'https://discord.gg/Y59XVpx'
      },
      {
        name: 'Bugs and Feature Requests',
        value: 'https://gitlab.com/cubismod/cubemoji/-/issues'
      }
    ])

    await interaction.reply({ embeds: [embed] })
  }
}
