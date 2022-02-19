import { AutocompleteInteraction, CommandInteraction, GuildMember } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import strings from '../../res/strings.json'
import { emoteAutocomplete } from '../../util/Autocomplete'
import { EditDiscord, parseForEmote } from '../../util/DiscordLogic'

@Discord()
export abstract class Jumbo {
  @Slash('jumbo', {
    description: 'blows up the input object'
  })
  async jumbo (
  @SlashOption('emote', {
    description: strings.emoteSlash,
    autocomplete: (interaction: AutocompleteInteraction) => emoteAutocomplete(interaction),
    type: 'STRING',
    required: false
  })
    emote: string,
  @SlashOption('member', { description: strings.memberSlash, required: false })
    member: GuildMember,
    interaction: CommandInteraction
  ) {
    await interaction.deferReply()
    if (emote !== undefined) {
      const res = await parseForEmote(interaction, emote)
      if (res) {
        const edDiscord = new EditDiscord(interaction, 'magnify magnify', res, interaction.user)
        await edDiscord.run()
      } else {
        await interaction.editReply(strings.noEmoteFound)
      }
    } else if (member !== undefined) {
      // user code
      // no need to defer a reply since we don't have to search through the emote cache
      const edDiscord = new EditDiscord(interaction, 'magnify magnify', member.displayAvatarURL({ format: 'png', dynamic: true, size: 256 }), interaction.user)
      await edDiscord.run()
    }
    if ((member === undefined) && (emote === undefined)) {
      await interaction.editReply({ content: strings.noArgs })
    }
  }
}
