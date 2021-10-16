import { CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { rescaleDiscord } from '../../ImgEffects'
import strings from '../../res/strings.json'

@Discord()
export abstract class Rescale {
  @Slash('rescale', { description: 'Rescale an image using Seam carving to humorous results' })
  async rescale (
    @SlashOption('source', { description: strings.sourceSlash })
      source: string,
      interaction: CommandInteraction
  ) {
    if (source === undefined) interaction.reply({ content: `${strings.missingArg} source`, ephemeral: true })
    else {
      await interaction.deferReply()
      await rescaleDiscord(interaction, source)
    }
  }
}
