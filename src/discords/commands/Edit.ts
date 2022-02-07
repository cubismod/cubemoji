import { AutocompleteInteraction, CommandInteraction, GuildMember } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import strings from '../../res/strings.json'
import imgEffects from '../../res/imgEffects.json'
import { editDiscord } from '../../util/ImageLogic'
import { editAutocomplete, emoteAutocomplete } from '../../util/Autocomplete'

@Discord()
export abstract class Edit {
  @Slash('edit', { description: 'Edits an emote or image according to the effects you select' })
  async edit (
    @SlashOption('source', {
      description: strings.sourceSlash,
      autocomplete: (interaction: AutocompleteInteraction) => emoteAutocomplete(interaction),
      type: 'STRING'
    })
      emote: string,
    @SlashOption('user', { description: 'a user' })
      user: GuildMember,
    @SlashOption('effects', {
      description: 'list of effects (space separated, max 20). If not specified then random effects will be applied',
      autocomplete: (interaction: AutocompleteInteraction) => editAutocomplete(interaction),
      type: 'STRING'
    })
      effects: string,
    @SlashOption('list', { description: 'get a list of the available effects' })
      list: boolean,
      interaction: CommandInteraction
  ) {
    if (list) {
      // just give the user back the effects options
      interaction.reply({ content: imgEffects.join(' '), ephemeral: true })
    } else {
      if (!emote && !user) {
        interaction.reply({ content: strings.noArgs, ephemeral: true })
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
