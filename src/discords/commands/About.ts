import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { CommandInteraction, Message, MessageEmbed } from 'discord.js'
import { Discord, Guard, Slash } from 'discordx'
import { container } from 'tsyringe'
import secrets from '../../res/secrets.json'
import { EmoteCache } from '../../util/EmoteCache'
import { CubeMessageManager } from '../../util/MessageManager'
import { bigServerDetect } from '../Guards'

dayjs.extend(relativeTime)

@Discord()
export abstract class About {
  @Guard(bigServerDetect)
  @Slash('about', {
    description: 'Provides information and stats about the bot.'
  })
  async about (interaction: CommandInteraction, data: {enrolled: boolean}) {
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
          value: `${secrets.version}`
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
      const msg = await interaction.reply({ embeds: [embed], fetchReply: true, ephemeral: data.enrolled })
      const cubeMessageManager = container.resolve(CubeMessageManager)
      if (msg instanceof Message) cubeMessageManager.registerTrashReact(interaction, msg, interaction.user.id)
    }
  }
}
