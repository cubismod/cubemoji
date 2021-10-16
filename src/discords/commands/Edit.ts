import { CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import strings from '../../res/strings.json'
import imgEffects from '../../res/imgEffects.json'
import { editDiscord } from '../../ImgEffects'

@Discord()
export abstract class Edit {
  @Slash('edit', { description: 'Edits an emote/avatar according to the effects you select' })
  async edit (
    @SlashOption('source', { description: strings.sourceSlash })
      source: string,
    @SlashOption('effects', { description: 'a list of effects with spaces between them, if not chosen then random effects will be applied' })
      effects: string,
    @SlashOption('list', { description: 'get a list of the available effects' })
      list: boolean,
      interaction: CommandInteraction
  ) {
    if (list) {
      // just give the user back the effects options
      interaction.reply({ content: imgEffects.join(), ephemeral: true })
    } else {
      if (source === undefined) {
        interaction.reply({ content: `${strings.missingArg} source`, ephemeral: true })
      } else {
        // actual edit work begins here as we have the source arg specified
        await interaction.deferReply()
        await editDiscord(interaction, effects, source)
      }
    }
  }
}
