import { ContextMenuInteraction } from 'discord.js'
import { Client, ContextMenu, Discord } from 'discordx'
import { EditDiscord, getMessageImage, RescaleDiscord } from '../lib/image/DiscordLogic'
import { BSGuardData } from './Guards'

@Discord()
export abstract class CubeMessageContext {
  @ContextMenu('MESSAGE', 'Apply edit to this message')
  async editHandler (
    interaction: ContextMenuInteraction,
    _client: Client,
    data: BSGuardData) {
    if (interaction.channel) {
      // fetch the message from the API
      await interaction.deferReply({ ephemeral: data.enrolled, fetchReply: !data.enrolled })
      const source = getMessageImage(await interaction.channel.messages.fetch(interaction.targetId))
      const edDiscord = new EditDiscord(interaction, '', source, interaction.user)
      await edDiscord.run()
    }
  }

  @ContextMenu('MESSAGE', 'Rescale this message')
  async rescaleHandler (
    interaction: ContextMenuInteraction,
    _client: Client,
    data: BSGuardData) {
    if (interaction.channel) {
      await interaction.deferReply({ ephemeral: data.enrolled, fetchReply: !data.enrolled })
      const source = getMessageImage(await interaction.channel.messages.fetch(interaction.targetId))
      const rsDiscord = new RescaleDiscord(interaction, source, interaction.user)
      await rsDiscord.run()
    }
  }
}
