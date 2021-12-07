import { AutocompleteInteraction, CommandInteraction, GuildMember } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { grabEmoteCache } from '../../util/CommandHelper'
import { emoteAutocomplete } from '../../util/Autocomplete'
import strings from '../../res/strings.json'

@Discord()
export abstract class Big {
  @Slash('big', {
    description: 'enlarges the input object'
  })
  async big (
    @SlashOption('emote', {
      description: strings.emoteSlash,
      autocomplete: (interaction: AutocompleteInteraction) => emoteAutocomplete(interaction),
      type: 'STRING'
    })
      emote: string,
    @SlashOption('member', { description: strings.memberSlash })
      member: GuildMember,
      interaction: CommandInteraction
  ) {
    const emoteCache = grabEmoteCache()
    if (emoteCache !== undefined) {
      if (emote !== undefined) {
        // emote parsing code
        await interaction.deferReply()
        const retrievedEmoji = await emoteCache.retrieve(emote)
        if (retrievedEmoji !== undefined) {
          await interaction.editReply(retrievedEmoji.url)
        } else {
          await interaction.editReply(strings.noEmoteFound)
        }
      } else if (member !== undefined) {
        // user code
        // no need to defer a reply since we don't have to search through the emote cache
        await interaction.reply(member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 }))
      }
      if ((member === undefined) && (emote === undefined)) {
        await interaction.reply({ content: strings.noArgs, ephemeral: true })
      }
    }
  }
}
