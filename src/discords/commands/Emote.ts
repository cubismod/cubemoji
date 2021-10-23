import { CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { grabEmoteCache } from '../../CommandHelper'
import { Source } from '../../Cubemoji'
import strings from '../../res/strings.json'

@Discord()
export abstract class Emote {
  @Slash('emote', {
    description: 'inserts an emote into chat'
  })
  async emote (
    @SlashOption('emote', { description: strings.emoteSlash })
      emote: string,
      interaction: CommandInteraction
  ) {
    if (emote !== undefined) {
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
      } else {
        await interaction.reply({ content: strings.noArgs, ephemeral: true })
      }
    }
  }
}
