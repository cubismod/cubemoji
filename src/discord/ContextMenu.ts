import { ApplicationCommandType, ContextMenuCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Client, ContextMenu, Discord } from 'discordx';
import { EditDiscord, getMessageImage, RescaleDiscord } from '../lib/image/DiscordLogic.js';
import { BSGuardData } from './Guards.js';

@Discord()
export abstract class CubeMessageContext {
  @ContextMenu({
    type: ApplicationCommandType.Message,
    name: 'Apply edit to this message',
    defaultMemberPermissions: PermissionFlagsBits.SendMessages
  })
  async editHandler(
    interaction: ContextMenuCommandInteraction,
    _client: Client,
    data: BSGuardData) {
    if (interaction.channel) {
      // fetch the message from the API
      await interaction.deferReply({ ephemeral: data.enrolled, fetchReply: !data.enrolled });
      const source = getMessageImage(await interaction.channel.messages.fetch(interaction.targetId));
      const edDiscord = new EditDiscord(interaction, '', source, interaction.user);
      await edDiscord.run();
    }
  }

  @ContextMenu({
    type: ApplicationCommandType.Message,
    name: 'Rescale this message',
    defaultMemberPermissions: PermissionFlagsBits.SendMessages
  })
  async rescaleHandler(
    interaction: ContextMenuCommandInteraction,
    _client: Client,
    data: BSGuardData) {
    if (interaction.channel) {
      await interaction.deferReply({ ephemeral: data.enrolled, fetchReply: !data.enrolled });
      const source = getMessageImage(await interaction.channel.messages.fetch(interaction.targetId));
      const rsDiscord = new RescaleDiscord(interaction, source, interaction.user);
      await rsDiscord.run();
    }
  }

  @ContextMenu({
    type: ApplicationCommandType.Message,
    name: 'Jumbofy this message',
    defaultMemberPermissions: PermissionFlagsBits.SendMessages
  })
  async jumboHandler(
    interaction: ContextMenuCommandInteraction,
    _client: Client,
    data: BSGuardData) {
    if (interaction.channel) {
      await interaction.deferReply({ ephemeral: data.enrolled, fetchReply: !data.enrolled });
      const source = getMessageImage(await interaction.channel.messages.fetch(interaction.targetId));
      const edDiscord = new EditDiscord(interaction, 'magnify magnify', source, interaction.user);
      await edDiscord.run();
    }
  }
}
