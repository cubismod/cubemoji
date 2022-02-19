import { CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashChoice, SlashOption } from 'discordx'
import { container } from 'tsyringe'
import { Source } from '../../util/Cubemoji'
import { sendPagination } from '../../util/DiscordLogic'
import { EmoteCache } from '../../util/EmoteCache'

@Discord()
export abstract class List {
  @Slash('list', {
    description: 'Get a full list of emojis'
  })
  async list (
    @SlashChoice('All', 'all')
    @SlashChoice('Discord', 'discord')
    @SlashChoice('Mutant', 'mutant')
    @SlashOption('subset', { description: 'Which subset of emotes would you like to choose from?' })
      subset: string,
      interaction: CommandInteraction) {
    const emoteCache = container.resolve(EmoteCache)

    if (emoteCache !== undefined) {
      if (subset === 'download') {
        // TO IMPLEMENT
      }
    } else {
      // the code for paginating is encapsulated in this other function
      let type = Source.Any
      if (subset === 'discord') type = Source.Discord
      if (subset === 'mutant') type = Source.Mutant
      sendPagination(interaction, type, emoteCache)
    }
  }
}
