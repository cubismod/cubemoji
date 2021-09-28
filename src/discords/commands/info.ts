// https://github.com/oceanroleplay/discord.ts-example/blob/main/src/commands/slashes.ts
import { CommandInteraction, MessageEmbed, GuildMember } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { Companion, Source } from '../../Cubemoji'

@Discord()
export abstract class Info {
  @Slash('info', {
    description: 'Provides information about an emote or user'
  })
  async info (
    @SlashOption('emote', { description: 'an emote name or actual emote' })
      emote: string,
    @SlashOption('member', { description: 'a mention of a server member' })
      member: GuildMember,
      interaction: CommandInteraction
  ) {
    const companion : Companion = globalThis.companion
    // check our args
    if (emote !== undefined) {
      // emote parsing code
      const emoteName = emote.toLowerCase()
      const res = companion.cache.retrieve(emoteName)
      if (res != null) {
        try {
          await interaction.deferReply()
        } catch (err) {
          console.error(err)
        }
        const embed = new MessageEmbed()
        embed.setColor('RANDOM')
        embed.setImage(res.url)
        embed.setTitle(res.name)
        switch (res.source) {
          case Source.Discord: {
            if (res.guildEmoji?.createdAt) embed.addField('Creation Date', res.guildEmoji.createdAt.toLocaleString())
            if (res.guildEmoji?.id) embed.addField('ID', res.guildEmoji.id)
            embed.addField('URL', res.url)
            if (res.guildEmoji?.animated) embed.addField('Animated', 'Yes')
            if (res.guildEmoji?.guild.name) embed.addField('Origin Server Name', res.guildEmoji.guild.name)
            const author = await res.guildEmoji?.fetchAuthor()
            if (author !== undefined) embed.addField('Author', author.username)
            try {
              await interaction.editReply({ embeds: [embed] })
            } catch (err) {
              console.error(err)
            }
            break
          }
          case Source.Mutant: {
            embed.addField('Disclaimer', ' This bot uses Mutant Standard emoji (https://mutant.tech) which are licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (https://creativecommons.org/licenses/by-nc-sa/4.0/).')
            try {
              await interaction.editReply({ embeds: [embed] })
            } catch (err) {
              console.error(err)
            }
          }
        }
      } else {
        try {
          await interaction.reply({ content: '**Error**: Emote not found!', ephemeral: true })
        } catch (err) {
          console.error(err)
        }
      }
    }
    if (member !== undefined) {
      const avatarURL = member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 })
      const embed = new MessageEmbed()
      embed.setColor('RANDOM')
      embed.setTitle(member.user.tag)
      embed.setImage(avatarURL)
      embed.addField('ID', member.user.id)
      embed.addField('Discord Join Date', member.user.createdAt.toLocaleString())
      if (member.joinedAt) embed.addField('Server Join Date', member.joinedAt.toLocaleString())
      embed.addField('Bot', member.user.bot.toString())
      try {
        await interaction.reply({ embeds: [embed] })
      } catch (err) {
        console.error(err)
      }
    }
    if ((member === undefined) && (emote === undefined)) {
      try {
        await interaction.reply({ content: '**Error**: No arguments specified', ephemeral: true })
      } catch (err) {
        console.error(err)
      }
    }
  }
}
