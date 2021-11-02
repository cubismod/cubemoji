// https://github.com/oceanroleplay/discord.ts-example/blob/main/src/commands/slashes.ts
import { CommandInteraction, MessageEmbed, GuildMember, AutocompleteInteraction } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { acResolver, grabEmoteCache } from '../../CommandHelper'
import { Source } from '../../Cubemoji'
import strings from '../../res/strings.json'

@Discord()
export abstract class Info {
  @Slash('info', {
    description: 'Provides information about an emote or user'
  })
  async info (
    @SlashOption('emote', {
      description: strings.emoteSlash,
      autocomplete: (interaction: AutocompleteInteraction) => acResolver(interaction),
      type: 'STRING'
    })
      emote: string,
    @SlashOption('member', { description: strings.memberSlash })
      member: GuildMember,
      interaction: CommandInteraction
  ) {
    const emoteCache = grabEmoteCache()
    if (emoteCache !== undefined) {
      // check our args
      if (emote !== undefined) {
        // emote parsing code
        const emoteName = emote.toLowerCase()
        const res = await emoteCache.retrieve(emoteName)
        if (res !== undefined) {
          try {
            await interaction.deferReply()
          } catch (err) {
            console.error(err)
            return
          }
          const embed = new MessageEmbed()
          embed.setColor('RANDOM')
          embed.setImage(res.url)
          embed.setTitle(res.name)
          switch (res.source) {
            case Source.Discord: {
              console.log(res.guildEmoji?.createdAt.getTime())
              if (res.guildEmoji?.createdAt) embed.addField('Creation Date', `<t:${Math.round(res.guildEmoji.createdAt.getTime() / 1000)}>`)
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
              break
            }
            default: {
              embed.setFooter('Note that this emote may actually be animated but the Discord embed is not, click and open in your browser to check.')
              try {
                await interaction.editReply({ embeds: [embed] })
              } catch (err) {
                console.error(err)
              }
            }
          }
        } else {
          try {
            await interaction.reply({ content: strings.noEmoteFound, ephemeral: true })
          } catch (err) {
            console.error(err)
          }
        }
      } else if (member !== undefined) {
        // user code
        const avatarURL = member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 })
        const embed = new MessageEmbed()
        embed.setColor('RANDOM')
        embed.setTitle(member.user.tag)
        embed.setImage(avatarURL)
        embed.addField('ID', member.user.id)
        embed.addField('Discord Join Date', `<t:${Math.round(member.user.createdAt.getTime() / 1000)}>`)
        if (member.joinedAt) embed.addField('This Server Join Date', `<t:${Math.round(member.joinedAt.getTime() / 1000)}>`)
        embed.addField('Bot', member.user.bot.toString())
        try {
          await interaction.reply({ embeds: [embed] })
        } catch (err) {
          console.error(err)
        }
      }
      if ((member === undefined) && (emote === undefined)) {
        try {
          await interaction.reply({ content: strings.noArgs, ephemeral: true })
        } catch (err) {
          console.error(err)
        }
      }
    }
  }
}