import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Colors, CommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { ButtonComponent, Discord, Slash } from 'discordx';
import { clearPage, rolePermissionCheck, rolesCommand } from '../../lib/http/RoleManager.js';

@Discord()
export abstract class Roles {
  @Slash({
    name: 'roles',
    description: 'Get a link to setup roles on this server',
    defaultMemberPermissions: PermissionFlagsBits.ViewChannel,
    dmPermission: false
  })
  async roles (
    interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true });

    // button to clear temporary page
    const button = new ButtonBuilder()
      .setLabel('Delete roles profile')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger)
      .setCustomId('delete-button');

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    if (interaction.guildId) {
      const res = await rolesCommand(interaction.user.id, interaction.guildId);
      const manageRolesPerm = await rolePermissionCheck(interaction.guildId, interaction.client);
      if (manageRolesPerm) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({ title: 'Roles Profile', description: res, color: Colors.DarkVividPink })
          ],
          components: [actionRow]
        });
      } else {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({
              description: 'Cubemoji does not have permissions to edit roles on this server therefore the Role Picker feature is disabled. Please contact a server moderator or administrator to ensure they enable the permission.',
              color: Colors.Red
            })
          ]
        });
      }
    }
  }

  @ButtonComponent({ id: 'delete-button' })
  async deleteButton(interaction: ButtonInteraction) {
    await interaction.deferReply({ ephemeral: true });

    if (interaction.guildId) {
      await clearPage(interaction.user.id, interaction.guildId);

      await interaction.editReply('Your roles profile has been deleted.');
    }
  }
}
