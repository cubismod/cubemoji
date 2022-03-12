import { CommandInteraction } from 'discord.js'
import { Client, Discord, Slash, SlashChoice, SlashOption } from 'discordx'
import { container } from 'tsyringe'
import { Source } from '../../lib/emote/Cmoji.js'
import { EmoteCache } from '../../lib/emote/EmoteCache.js'
import { sendPagination } from '../../lib/image/DiscordLogic.js'
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
    @SlashChoice('Web', 'web')
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
      case 'web':
        interaction.reply(`Check out an online emoji list at ${process.env.CM_URL}.`)
        return
    }
    sendPagination(interaction, type, emoteCache, data.enrolled)
  }
}
