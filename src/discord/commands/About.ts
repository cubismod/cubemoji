import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { CommandInteraction, MessageEmbed } from 'discord.js'
import { Client, Discord, Guard, Slash } from 'discordx'
import { container } from 'tsyringe'
import { EmoteCache } from '../../lib/emote/EmoteCache.js'
import { bigServerDetect, BSGuardData } from '../Guards'

dayjs.extend(relativeTime)

@Discord()
export abstract class About {
  @Guard(bigServerDetect)
  @Slash('about', {
    description: 'Provides information and stats about the bot.'
  })
  async about (interaction: CommandInteraction, _client: Client, data: BSGuardData) {
    const emoteCache = container.resolve(EmoteCache)
    if (emoteCache !== undefined) {
      const embed = new MessageEmbed()
      embed.setTitle('Cubemoji')
      embed.setThumbnail('https://gitlab.com/cubismod/cubemoji/-/raw/master/assets/icon.png')
      embed.setColor(0x91d7f2)
      embed.author = { name: 'Created by cubis' }
      embed.setDescription('a simple emoji bot built to last ⌛')

      embed.addFields([
        {
          name: 'GitLab',
          value: 'https://gitlab.com/cubismod/cubemoji'
        },
        {
          name: 'Version',
          value: `${process.env.npm_package_version}`
        },
        {
          name: 'License',
          value: 'MIT'
        },
        {
          name: 'Stats',
          value: `Current Emote Count: ${emoteCache.emojis.length}\nUptime: ${dayjs().to(interaction.client.readyAt, true)}\nServers: ${interaction.client.guilds.cache.size}`
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
      // ephemeral replies when in an enrolled server
      await interaction.reply({ embeds: [embed], ephemeral: data.enrolled })
    }
  }
}
