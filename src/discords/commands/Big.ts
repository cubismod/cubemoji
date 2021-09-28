import { CommandInteraction, GuildMember } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { Companion } from '../../Cubemoji'

@Discord()
export abstract class Big {
  @Slash('big', {
    description: 'enlarges the input object'
  })
  async big (
    @SlashOption('emote', { description: 'an emote name or actual emote, nitro is fine' })
      emote: string,
    @SlashOption('member', { description: 'a mention of a server member' })
      member: GuildMember,
      interaction: CommandInteraction
  ) {
    const companion : Companion = globalThis.companion
    if (emote !== undefined) {
      // emote parsing code
      try {
        await interaction.deferReply()
      } catch (err) {
        console.error(err)
      }
      const retrievedEmoji = await companion.cache.retrieve(emote)
      if (retrievedEmoji) {
        try {
          await interaction.editReply(retrievedEmoji.url)
        } catch (err) {
          console.error(err)
        }
      } else {
        try {
          await interaction.editReply('**Error:** no emote found')
        } catch (err) {
          console.error(err)
        }
      }
    } else if (member !== undefined) {
      // user code
      await interaction.reply(member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 }))
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
