/* import { CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Client, Discord, Guard, Slash } from 'discordx';
import { container } from 'tsyringe';
import { CubeLogger } from '../../lib/observability/CubeLogger';
import { botOwnerDetect } from '../Guards';

const logger = container.resolve(CubeLogger).command;

@Discord()
@Guard(botOwnerDetect)
export abstract class FlushCommands {
  @Slash({ name: 'flushcommands', defaultMemberPermissions: PermissionFlagsBits.Administrator, description: 'flush all commands' })
  async flushCommands(interaction: CommandInteraction) {
    await interaction.deferReply();
    const msgContent = ['Flushing commands', '0', '/', '0', 'none'];

    await interaction.editReply({
      content: 'deleting commands'
    });

    const client = container.resolve(Client);
    for (const guild of client.guilds.cache) {
      await guild[1].commands.fetch();
      msgContent[3] = guild[1].commands.cache.size.toString();
      msgContent[4] = guild[1].name;

      let count = 0;

      for (const command of guild[1].commands.cache) {
        try {
          await guild[1].commands.delete(command[1]);
          count++;

          msgContent[1] = count.toString();
          logger.info(`Deleted ${command[1].name} in ${guild[1]}`);
        } catch (err) {
          logger.error(err);
        }
      }
      const msg = `All commands have been deleted in ${guild[1].name}`;
      logger.info(msg);
    }
    process.exit();
  }
} */

/* import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, Guild, PermissionFlagsBits } from 'discord.js';
import { ButtonComponent, Client, Discord, Guard, Slash, SlashOption } from 'discordx';
import { container } from 'tsyringe';
import { InspectorWrapper } from '../../lib/perf/InspectorWrapper';
import { botOwnerDetect } from '../Guards';

@Discord()
@Guard(botOwnerDetect)
export abstract class LeaveGuild {
  resolved: Guild | null = null;

  @Slash('leaveguild', { description: 'Leave a guild', defaultMemberPermissions: PermissionFlagsBits.Administrator })
  async leaveGuild(
    @SlashOption('id', { description: 'id of the guild to leave', required: false })
      id: string,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply();
    if (id === undefined) {
      // just print out list of guilds we are in
      const reply: string[] = [];
      const guilds = await interaction.client.guilds.fetch();
      guilds.forEach(guild => {
        reply.push(guild.name);
        reply.push(' -> ');
        reply.push(guild.id);
        reply.push('\n');
      });
      await interaction.editReply(reply.join(''));
    } else {
      // perform guild leave now
      this.resolved = await interaction.client.guilds.resolve(id);
      if (this.resolved) {
        // create button components
        const yesBtn = new ButtonBuilder()
          .setLabel('Yes')
          .setStyle(ButtonStyle.Danger)
          .setCustomId('yes-btn');
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(yesBtn);
        interaction.editReply({
          content: `are you sure that you want to leave the guild ${this.resolved.name}?`,
          components: [row]
        });
      } else {
        interaction.editReply('no guild found with that id');
      }
    }
  }

  // handler for button
  @ButtonComponent('yes-btn')
  async yesBtn() {
    if (this.resolved) {
      await this.resolved.leave();
    }
  }
}

@Discord()
@Guard(botOwnerDetect)
export abstract class PerformanceTest {
  private inspector = container.resolve(InspectorWrapper);
  @Slash('performancetest', { description: 'Run a CPU performance test', defaultMemberPermissions: PermissionFlagsBits.Administrator })
  async performanceTest(interaction: CommandInteraction) {
    switch (this.inspector.status) {
      case true:
        interaction.reply({
          content: '💬 Ending the currently running performance test. Results are saved to bucket.'
        });
        break;
      case false:
        interaction.reply({
          content: '💭 Starting new performance test every min. Heap dump is being run now and repeatedly. Results are saved to bucket.'
        });
    }
    await this.inspector.toggleSession();
  }
}

@Discord()
@Guard(botOwnerDetect)
export abstract class ClearCommands {
  private client = container.resolve(Client);
  @Slash('clearcommands', { description: 'Clear all commands', defaultMemberPermissions: PermissionFlagsBits.Administrator })
  async clearCommmands (interaction: CommandInteraction) {
    await interaction.reply('processing...');
    await this.client.clearApplicationCommands();
    await this.client.initApplicationCommands({
      global: {
        log: true
      }
    });
    await interaction.followUp('done!');
  }
}
 */
