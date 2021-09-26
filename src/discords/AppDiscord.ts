import { CommandInteraction } from 'discord.js'
import {
  Discord,
  Slash,
  SlashGroup
} from 'discordx'

@Discord()
@SlashGroup('Utility', 'Utility commands used by cubemoji')
export abstract class Utility {
  @Slash('ping', {
    description: 'Test whether the bot is up'
  })
  ping (
    interaction: CommandInteraction) {
    interaction.reply('pong')
  }
}
