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
        try {
          await channel.send({
            embeds: [
              new EmbedBuilder({
                color: Colors.Blue,
                title: `${guildMember.displayName} joined`,
                thumbnail: {
                  url: guildMember.displayAvatarURL({ size: 128, extension: 'png' })
                },
                timestamp: Date(),
                fields: [
                  {
                    name: 'ID',
                    value: guildMember.id
                  }, {
                    name: 'User',
                    value: guildMember.toString()
                  }]
              })
            ]
          });
          this.logger.info(`Logging new join to ${guildMember.guild.name}/${guildMember.guild.id}: ${guildMember.displayName}/${guildMember.id}`);
        } catch (err) {
          this.logger.error(err);
        }
      }
    }
  }
}
