import { CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashChoice, SlashOption } from 'discordx'
import { grabEmoteCache, sendPagination } from '../../CommandHelper'
import { Source } from '../../Cubemoji'

@Discord()
export abstract class List {
  @Slash('list', {
    description: 'Get a full list of emojis'
  })
  async list (
    @SlashChoice('Discord', 'discord')
    @SlashChoice('Mutant', 'mutant')
    @SlashChoice('All', 'all')
    @SlashOption('subset', { description: 'Which subset of emotes would you like to choose from?', required: true })
      subset: string,
      interaction: CommandInteraction) {
    const emoteCache = grabEmoteCache()
    if (emoteCache !== undefined) {
      // the code for paginating is encapsulated in this other function
      let type = Source.Any
      if (subset === 'discord') type = Source.Discord
      if (subset === 'mutant') type = Source.Mutant
      sendPagination(interaction, type, emoteCache)
    }
  }
}
