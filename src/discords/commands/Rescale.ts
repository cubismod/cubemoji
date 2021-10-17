import { CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { rescaleDiscord } from '../../ImgEffects'
import strings from '../../res/strings.json'

@Discord()
export abstract class Rescale {
  @Slash('rescale', { description: 'Rescale an image or emote using Seam carving to humorous results' })
  async rescale (
    @SlashOption('source', { description: strings.sourceSlash, required: true })
      source: string,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply()
    await rescaleDiscord(interaction, source)
  }
}
