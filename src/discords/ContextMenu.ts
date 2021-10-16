import { ContextMenuInteraction } from 'discord.js'
import { ContextMenu, Discord } from 'discordx'
import { getMessageImage } from '../CommandHelper'
import { editDiscord } from '../ImgEffects'

@Discord()
export abstract class CubeMessageContext {
  @ContextMenu('MESSAGE', 'Apply a random edit')
  async editHandler (interaction: ContextMenuInteraction) {
    if (interaction.channel) {
      // fetch the message from the API
      await interaction.deferReply()
      const source = getMessageImage(await interaction.channel.messages.fetch(interaction.targetId))
      await editDiscord(interaction, '', source)
    }
  }
}
