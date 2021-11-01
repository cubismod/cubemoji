import { AutocompleteInteraction, CommandInteraction, GuildMember } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import strings from '../../res/strings.json'
import imgEffects from '../../res/imgEffects.json'
import { editDiscord } from '../../ImgEffects'
import { acResolver } from '../../CommandHelper'

@Discord()
export abstract class Edit {
  @Slash('edit', { description: 'Edits an emote or image according to the effects you select' })
  async edit (
    @SlashOption('source', {
      description: strings.sourceSlash,
      autocomplete: (interaction: AutocompleteInteraction) => acResolver(interaction),
      type: 'STRING'
    })
      emote: string,
    @SlashOption('user', { description: 'a user' })
      user: GuildMember,
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
      if (!emote && !user) {
        interaction.reply({ content: `${strings.missingArg} source`, ephemeral: true })
      } else if (emote) {
        await interaction.deferReply()
        await editDiscord(interaction, effects, emote, interaction.user)
      } else if (user) {
        await interaction.deferReply()
        await editDiscord(interaction, effects, user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 }), interaction.user)
      }
    }
  }
}
