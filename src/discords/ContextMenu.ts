import { ContextMenuInteraction } from 'discord.js'
import { ContextMenu, Discord } from 'discordx'
import { getMessageImage } from '../CommandHelper'
import { editDiscord, rescaleDiscord } from '../ImgEffects'

@Discord()
export abstract class CubeMessageContext {
  @ContextMenu('MESSAGE', 'Apply a random edit')
  async editHandler (interaction: ContextMenuInteraction) {
    if (interaction.channel) {
      // fetch the message from the API
      await interaction.deferReply()
      const source = getMessageImage(await interaction.channel.messages.fetch(interaction.targetId))
      await editDiscord(interaction, '', source, interaction.user)
    }
  }

  @ContextMenu('MESSAGE', 'Rescale an image')
  async rescaleHandler (interaction: ContextMenuInteraction) {
    if (interaction.channel) {
      await interaction.deferReply()
      const source = getMessageImage(await interaction.channel.messages.fetch(interaction.targetId))
      await rescaleDiscord(interaction, source, interaction.user)
    }
  }
}
