import { AutocompleteInteraction, Client, CommandInteraction, GuildMember } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { emoteAutocomplete } from '../../lib/cmd/Autocomplete'
import { RescaleDiscord } from '../../lib/image/DiscordLogic'
import strings from '../../res/strings.json'
import { BSGuardData } from '../Guards'

@Discord()
export abstract class Rescale {
  @Slash('rescale', { description: 'Rescale an image or emote using Seam carving to humorous results' })
  async rescale (
    @SlashOption('source', {
      description: strings.sourceSlash,
      autocomplete: (interaction: AutocompleteInteraction) => emoteAutocomplete(interaction),
      type: 'STRING',
      required: false
    })
      emote: string,
    @SlashOption('user', { description: 'a user', required: false })
      user: GuildMember,
      interaction: CommandInteraction,
      _client: Client,
      data: BSGuardData
  ) {
    const deferOptions = {
      ephemeral: data.enrolled,
      fetchReply: !data.enrolled
    }
    if (!emote && !user) {
      interaction.reply({ content: strings.noArgs, ephemeral: true })
    } else if (emote) {
      await interaction.deferReply(deferOptions)
      const rsDiscord = new RescaleDiscord(interaction, emote, interaction.user)
      await rsDiscord.run()
    } else if (user) {
      await interaction.deferReply(deferOptions)
      const rsDiscord = new RescaleDiscord(interaction, user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 }), interaction.user)
      await rsDiscord.run()
    }
  }
}
