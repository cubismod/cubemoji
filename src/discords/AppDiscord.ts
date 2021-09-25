import { CommandInteraction } from 'discord.js'
import {
  Discord,
  Slash
} from 'discordx'

@Discord()
export abstract class AppDiscord {
  @Slash('ping')
  ping (
    interaction: CommandInteraction) {
    interaction.reply('pong')
  }
}
