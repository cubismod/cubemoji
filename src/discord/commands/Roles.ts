import { ButtonInteraction, CommandInteraction, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { ButtonComponent, Discord, Slash } from 'discordx';
import { clearPage, rolePermissionCheck, rolesCommand } from '../../lib/http/RoleManager';

@Discord()
export abstract class Roles {
  @Slash('roles', { description: 'Get a link to setup roles on this server' })
  async roles (
    interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true });

    // button to clear temporary page
    const button = new MessageButton()
      .setLabel('Delete roles profile')
      .setEmoji('🗑️')
      .setStyle('DANGER')
      .setCustomId('delete-button');

    const actionRow = new MessageActionRow().addComponents(button);

    if (interaction.guildId) {
      const res = await rolesCommand(interaction.user.id, interaction.guildId);
      const manageRolesPerm = await rolePermissionCheck(interaction.guildId, interaction.client);
      if (manageRolesPerm) {
        await interaction.editReply({
          embeds: [
            new MessageEmbed({ title: 'Roles Profile', description: res, color: 'DARK_VIVID_PINK' })
          ],
          components: [actionRow]
        });
      } else {
        await interaction.editReply({
          embeds: [
            new MessageEmbed({ description: 'Cubemoji does not have permissions to edit roles on this server therefore the Role Picker feature is disabled. Please contact a server moderator or administrator to ensure they enable the permission.', color: 'RED' })
          ]
        });
      }
    }
  }

  @ButtonComponent('delete-button')
  async deleteButton(interaction: ButtonInteraction) {
    await interaction.deferReply({ ephemeral: true });

    if (interaction.guildId) {
      await clearPage(interaction.user.id, interaction.guildId);

      await interaction.editReply('Your roles profile has been deleted.');
    }
  }
}
