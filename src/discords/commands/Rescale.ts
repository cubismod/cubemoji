import { CommandInteraction, GuildMember } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { rescaleDiscord } from '../../ImgEffects'
import strings from '../../res/strings.json'

@Discord()
export abstract class Rescale {
  @Slash('rescale', { description: 'Rescale an image or emote using Seam carving to humorous results' })
  async rescale (
    @SlashOption('emote', { description: strings.missingArg })
      emote: string,
    @SlashOption('user', { description: 'a user' })
      user: GuildMember,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply()
    if (!emote && !user) {
      interaction.reply({ content: `${strings.missingArg} source`, ephemeral: true })
    } else if (emote) {
      await rescaleDiscord(interaction, emote)
    } else if (user) {
      await rescaleDiscord(interaction, user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 }))
    }
  }
}
