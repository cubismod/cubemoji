import { CommandInteraction } from 'discord.js';
import { Discord, Slash } from 'discordx';

@Discord()
export abstract class Roles {
  @Slash('roles', { description: 'Get a link to setup roles on this server' })
  async roles (
    interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true });
  }
}
