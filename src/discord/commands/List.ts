import { CommandInteraction } from 'discord.js'
import { Client, Discord, Slash, SlashChoice, SlashOption } from 'discordx'
import { container } from 'tsyringe'
import { Source } from '../../lib/emote/Cmoji'
import { EmoteCache } from '../../lib/emote/EmoteCache'
import { sendPagination } from '../../lib/image/DiscordLogic'
import { BSGuardData } from '../Guards'

@Discord()
export abstract class List {
  @Slash('list', {
    description: 'Get a full list of emojis'
  })
  async list (
    @SlashChoice('All', 'all')
    @SlashChoice('Discord', 'discord')
    @SlashChoice('Mutant', 'mutant')
    @SlashChoice('This Server', 'thisserver')
    @SlashOption('subset', { description: 'Which subset of emotes would you like to choose from?' })
      subset: string,
      interaction: CommandInteraction,
      _client: Client,
      data: BSGuardData) {
    const emoteCache = container.resolve(EmoteCache)
    let type = Source.Any

    switch (subset) {
      case 'discord':
        type = Source.Discord
        break
      case 'mutant':
        type = Source.Mutant
        break
      case 'thisserver':
        type = Source.ThisServer
    }
    sendPagination(interaction, type, emoteCache, data.enrolled)
  }
}
