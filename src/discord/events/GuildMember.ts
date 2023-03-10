import { EmbedBuilder } from '@discordjs/builders';
import { Colors } from 'discord.js';
import { ArgsOf, Client, Discord, On } from 'discordx';
import { container } from 'tsyringe';
import { CubeStorage } from '../../lib/db/Storage.js';
import { CubeLogger } from '../../lib/observability/CubeLogger.js';

@Discord()
export abstract class GuildMemberEvents {
  private logger = container.resolve(CubeLogger).events;
  private auditStorage = container.resolve(CubeStorage).serverAuditInfo;
  private joinLogs = container.resolve(CubeStorage).joinLogs;

  private genJoinID(guildID: string, userID: string) {
    return `${guildID}-${userID}`;
  }

  @On({ event: 'guildMemberAdd' })
  async guildMemberAdd(
    [guildMember]: ArgsOf<'guildMemberAdd'>,
    client: Client
  ) {
    const guildId = guildMember.guild.id;
    const auditSettings = await this.auditStorage.get(guildId);

    if (auditSettings && auditSettings.joinLogs && auditSettings.auditChannel) {
      // fetch the channel
      const channel = await client.channels.fetch(auditSettings.auditChannel);
      if (channel?.isTextBased()) {
        const embed = new EmbedBuilder({
          color: Colors.Green,
          title: `${guildMember.displayName} joined`,
          thumbnail: {
            url: guildMember.displayAvatarURL({ size: 64, extension: 'png' })
          },
          url: guildMember.displayAvatarURL({ size: 512, extension: 'png' }),
          fields: [
            {
              name: 'ID',
              value: guildMember.id
            }, {
              name: 'User',
              value: guildMember.toString()
            }, {
              name: 'Server Join Date',
              value: `<t:${Math.round(Date.now() / 1000)}>`
            }]
        });
        try {
          await channel.send({
            embeds: [
              embed
            ]
          });

          await this.joinLogs.set(
            this.genJoinID(guildMember.guild.id, guildMember.id), {
              joinDate: Date(),
              embed
            }
          );
        } catch (err) {
          this.logger.error(err);
        }
      }
    }
  }

  // update the original embed if someone leaves
  @On({ event: 'guildMemberRemove' })
  async guildMemberRemove(
    [guildMember]: ArgsOf<'guildMemberRemove'>,
    client: Client
  ) {
    const guildId = guildMember.guild.id;
    const auditSettings = await this.auditStorage.get(guildId);
    const joinId = this.genJoinID(guildMember.guild.id, guildMember.id);
    const joinLog = await this.joinLogs.get(joinId);

    if (auditSettings &&
      auditSettings.joinLogs &&
      auditSettings.auditChannel &&
      joinLog) {
      const channel = await client.channels.fetch(auditSettings.auditChannel);

      if (channel?.isTextBased()) {
        const embed = new EmbedBuilder({
          color: Colors.Red,
          title: `${guildMember.displayName} joined and left`,
          thumbnail: {
            url: guildMember.displayAvatarURL({ size: 64, extension: 'png' })
          },
          url: guildMember.displayAvatarURL({ size: 512, extension: 'png' }),
          fields: [{
            name: 'Server Leave Date',
            value: `<t:${Math.round(Date.now() / 1000)}>`
          },
          {
            name: 'ID',
            value: guildMember.id
          }, {
            name: 'User',
            value: guildMember.toString()
          }]
        });

        try {
          await channel.send({
            embeds: [
              embed
            ]
          });

          await this.joinLogs.delete(joinId);
        } catch (err) {
          this.logger.error(err);
        }
      }
    }
  }
}
