import { randomUUID } from 'crypto';
import { CommandInteraction, Guild, MessageActionRow, MessageAttachment, MessageButton } from 'discord.js';
import { ButtonComponent, Discord, Guard, Slash, SlashOption } from 'discordx';
import { rm, writeFile } from 'fs/promises';
import path from 'path';
import { container } from 'tsyringe';
import { CubeLogger } from '../../lib/observability/CubeLogger';
import { InspectorWrapper } from '../../lib/perf/InspectorWrapper';
import { botOwnerDetect } from '../Guards';

const logger = container.resolve(CubeLogger).command;

@Discord()
@Guard(botOwnerDetect)
export abstract class LeaveGuild {
  resolved: Guild | null = null;

  @Slash('leaveguild', { description: 'Leave a guild' })
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
        const yesBtn = new MessageButton()
          .setLabel('Yes')
          .setStyle('DANGER')
          .setCustomId('yes-btn');
        const row = new MessageActionRow().addComponents(yesBtn);
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
  @Slash('performancetest', { description: 'Run a CPU performance test' })
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
export abstract class PermGrab {
  @Slash('permgrab')
  async permGrab(interaction: CommandInteraction) {
    // https://discord.com/developers/docs/interactions/application-commands#permissions
    // Get a list of application.id
    // all guild ids
    // all command ids
    // and put into a text document

    await interaction.deferReply();

    const message: string[] = [];

    message.push(`Application ID: ${interaction.client.application?.id}`);

    message.push('\nCommands:');

    // push each guildID and all the commandIDs in each
    for (const guild of interaction.client.guilds.cache) {
      message.push(`\n${guild[0]}, ${guild[1].name}\n`);
      for (const command of guild[1].commands.cache) {
        message.push(command[0]);
      }
    }

    // save to a file
    const fileName = path.join('./download', randomUUID() + '.txt');
    try {
      await writeFile(fileName, message.join('\n'));
    } catch (err) {
      logger.error(err);
      await interaction.editReply('Unable to write to file.');
    }
    await interaction.editReply({
      files: [
        new MessageAttachment(fileName)
      ]
    });
    await rm(fileName);
  }
}
