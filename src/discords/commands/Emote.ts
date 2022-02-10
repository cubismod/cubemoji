import { AutocompleteInteraction, CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { container } from 'tsyringe'
import strings from '../../res/strings.json'
import { emoteAutocomplete } from '../../util/Autocomplete'
import { Source } from '../../util/Cubemoji'
import { EmoteCache } from '../../util/EmoteCache'

@Discord()
export abstract class Emote {
  @Slash('emote', {
    description: 'inserts an emote into chat'
  })
  async emote (
    @SlashOption('emote', {
      description: strings.emoteSlash,
      autocomplete: (interaction: AutocompleteInteraction) => emoteAutocomplete(interaction),
      type: 'STRING'
    })
      emote: string,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply()
    const emoteCache = container.resolve(EmoteCache)
    if (emoteCache !== undefined) {
      const retrievedEmoji = await emoteCache.retrieve(emote)
      if (retrievedEmoji !== undefined) {
        let msg = ''
        // now send a different obj depending on what type of emote we are sending
        switch (retrievedEmoji.source) {
          case Source.Discord: {
            if (retrievedEmoji.guildEmoji != null) msg = retrievedEmoji.guildEmoji.toString()
            break
          }
          case Source.Mutant:
          case Source.URL:
            msg = retrievedEmoji.url
        }
        await interaction.editReply(msg)
      } else {
        await interaction.editReply({ content: strings.noEmoteFound })
      }
    }
  }
}
