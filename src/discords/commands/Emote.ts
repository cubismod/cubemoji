import { AutocompleteInteraction, CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { acResolver, grabEmoteCache } from '../../util/CommandHelper'
import { Source } from '../../util/Cubemoji'
import strings from '../../res/strings.json'

@Discord()
export abstract class Emote {
  @Slash('emote', {
    description: 'inserts an emote into chat'
  })
  async emote (
    @SlashOption('emote', {
      description: strings.emoteSlash,
      autocomplete: (interaction: AutocompleteInteraction) => acResolver(interaction),
      required: true,
      type: 'STRING'
    })
      emote: string,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply()
    const emoteCache = grabEmoteCache()
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
