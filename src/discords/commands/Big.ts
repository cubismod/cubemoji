import { CommandInteraction, GuildMember } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { Companion } from '../../Cubemoji'
import strings from '../../res/strings.json'

@Discord()
export abstract class Big {
  @Slash('big', {
    description: 'enlarges the input object'
  })
  async big (
    @SlashOption('emote', { description: strings.emoteSlash })
      emote: string,
    @SlashOption('member', { description: strings.memberSlash })
      member: GuildMember,
      interaction: CommandInteraction
  ) {
    const companion : Companion = globalThis.companion
    if (emote !== undefined) {
      // emote parsing code
      await interaction.deferReply()
      const retrievedEmoji = await companion.cache.retrieve(emote)
      if (retrievedEmoji !== undefined) {
        await interaction.editReply(retrievedEmoji.url)
      } else {
        await interaction.editReply(strings.noEmoteFound)
      }
    } else if (member !== undefined) {
      // user code
      await interaction.reply(member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 }))
    }
    if ((member === undefined) && (emote === undefined)) {
      await interaction.reply({ content: strings.noArgs, ephemeral: true })
    }
  }
}
