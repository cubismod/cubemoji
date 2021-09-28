// https://github.com/oceanroleplay/discord.ts-example/blob/main/src/commands/slashes.ts
import { CommandInteraction, User, MessageEmbed } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { Companion } from '../../Cubemoji'

@Discord()
export abstract class Info {
  @Slash('info', {
    description: 'Provides information about an emote or user'
  })
  async info (
    @SlashOption('emote', { description: 'an emote name or actual emote' })
      emote: string,
    @SlashOption('user', { description: 'a mention of a user' })
      user: User,
      interaction: CommandInteraction
  ) {
    const companion : Companion = globalThis.companion
    // check our args
    if (emote != null) {
      await interaction.deferReply()
      // emote parsing code
      const emoteName = emote.toLowerCase()
      const res = companion.cache.retrieve(emoteName)
      if (res != null) {
        const embed = new MessageEmbed()
        embed.color = 7738070
        embed.setImage(res.url)
        embed.setTitle(res.name)
        switch (res.source) {
          case 0: {
            if (res.guildEmoji?.createdAt) embed.addField('Creation Date', res.guildEmoji.createdAt.toLocaleString())
            if (res.guildEmoji?.id) embed.addField('ID', res.guildEmoji.id)
            embed.addField('URL', res.url)
            if (res.guildEmoji?.animated) embed.addField('Animated', res.guildEmoji.animated.toString())
            if (res.guildEmoji?.guild.name) embed.addField('Origin Server Name', res.guildEmoji.guild.name)
            const author = await res.guildEmoji?.fetchAuthor()
            if (author !== undefined) embed.addField('Author', author.username)
            await interaction.editReply({ embeds: [embed] })
          }
        }
      } else {
        interaction.reply('Emote not found!')
        console.log(user)
      }
    }
  }
}
