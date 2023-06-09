import { CommandInteraction } from 'discord.js';
import { Discord, Slash } from 'discordx';

@Discord()
export abstract class Uptime {
  @Slash({
    name: 'uptime',
    description: 'show bot current uptime',
    defaultMemberPermissions: 'SendMessages',
    dmPermission: true
  })
  async uptime(interaction: CommandInteraction) {
    const timestamp = interaction.client.readyTimestamp;
    if (timestamp) {
      const secTimestamp = Math.ceil(timestamp / 1000);
      await interaction.reply(
        {
          content: `Launched <t:${secTimestamp}:R> at <t:${secTimestamp}>`,
          ephemeral: true
        }
      );
    }
  }
}
