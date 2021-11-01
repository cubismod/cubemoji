import { AutocompleteInteraction, CommandInteraction, GuildMember } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { acResolver } from '../../CommandHelper'
import { rescaleDiscord } from '../../ImgEffects'
import strings from '../../res/strings.json'

@Discord()
export abstract class Rescale {
  @Slash('rescale', { description: 'Rescale an image or emote using Seam carving to humorous results' })
  async rescale (
    @SlashOption('source', {
      description: strings.sourceSlash,
      autocomplete: (interaction: AutocompleteInteraction) => acResolver(interaction),
      type: 'STRING'
    })
      emote: string,
    @SlashOption('user', { description: 'a user' })
      user: GuildMember,
      interaction: CommandInteraction
  ) {
    if (!emote && !user) {
      interaction.reply({ content: strings.noArgs, ephemeral: true })
    } else if (emote) {
      await interaction.deferReply()
      await rescaleDiscord(interaction, emote, interaction.user)
    } else if (user) {
      await interaction.deferReply()
      await rescaleDiscord(interaction, user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 }), interaction.user)
    }
  }
}
