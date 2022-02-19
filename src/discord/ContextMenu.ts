import { ContextMenuInteraction } from 'discord.js'
import { ContextMenu, Discord } from 'discordx'
import { EditDiscord, FaceDiscord, getMessageImage, RescaleDiscord } from '../util/DiscordLogic'

@Discord()
export abstract class CubeMessageContext {
  @ContextMenu('MESSAGE', 'Apply edit to this message')
  async editHandler (interaction: ContextMenuInteraction) {
    if (interaction.channel) {
      // fetch the message from the API
      await interaction.deferReply()
      const source = getMessageImage(await interaction.channel.messages.fetch(interaction.targetId))
      const edDiscord = new EditDiscord(interaction, '', source, interaction.user)
      await edDiscord.run()
    }
  }

  @ContextMenu('MESSAGE', 'Rescale this message')
  async rescaleHandler (interaction: ContextMenuInteraction) {
    if (interaction.channel) {
      await interaction.deferReply()
      const source = getMessageImage(await interaction.channel.messages.fetch(interaction.targetId))
      const rsDiscord = new RescaleDiscord(interaction, source, interaction.user)
      await rsDiscord.run()
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
      const faceDiscord = new FaceDiscord(interaction, faceName, source, interaction.user)
      await faceDiscord.run()
    }
  }
}
