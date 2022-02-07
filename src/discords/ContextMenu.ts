import { ContextMenuInteraction } from 'discord.js'
import { ContextMenu, Discord } from 'discordx'
import { getMessageImage } from '../util/DiscordLogic'
import { editDiscord, performAddFace, rescaleDiscord } from '../util/ImageLogic'

@Discord()
export abstract class CubeMessageContext {
  @ContextMenu('MESSAGE', 'Apply edit to this message')
  async editHandler (interaction: ContextMenuInteraction) {
    if (interaction.channel) {
      // fetch the message from the API
      await interaction.deferReply()
      const source = getMessageImage(await interaction.channel.messages.fetch(interaction.targetId))
      await editDiscord(interaction, '', source, interaction.user)
    }
  }

  @ContextMenu('MESSAGE', 'Rescale this message')
  async rescaleHandler (interaction: ContextMenuInteraction) {
    if (interaction.channel) {
      await interaction.deferReply()
      const source = getMessageImage(await interaction.channel.messages.fetch(interaction.targetId))
      await rescaleDiscord(interaction, source, interaction.user)
    }
  }

  /* TODO: actually test these!
  @ContextMenu('MESSAGE', 'Add 🥺 to this message')
  async pleadHandler (interaction: ContextMenuInteraction) {
    await this.addFaceHelper(interaction, 'plead')
  }

  @ContextMenu('MESSAGE', 'Add 😳 to this message')
  async flushedHandler (interaction: ContextMenuInteraction) {
    await this.addFaceHelper(interaction, 'flushed')
  } */

  /**
   * adds the correct args to perform an add face from context menu
   * @param interaction self explanatory
   * @param faceName a string corresponding with a face type, see AddFace.ts
   * */
  async addFaceHelper (interaction: ContextMenuInteraction, faceName: string) {
    if (interaction.channel) {
      await interaction.deferReply()
      const source = getMessageImage(await interaction.channel.messages.fetch(interaction.targetId))
      await performAddFace(source, faceName)
    }
  }
}
