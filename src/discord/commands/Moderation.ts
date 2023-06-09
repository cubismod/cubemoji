// Various server configuration commands

import { Pagination } from '@discordx/pagination';
import {
  ApplicationCommandOptionType,
  AttachmentBuilder,
  AutocompleteInteraction,
  Colors,
  CommandInteraction,
  EmbedBuilder,
  Role,
  TextChannel,
  VoiceChannel
} from 'discord.js';
import { Discord, Slash, SlashChoice, SlashGroup, SlashOption } from 'discordx';
import { rm } from 'fs/promises';
import { container } from 'tsyringe';
import { GitClient } from '../../lib/cd/GitClient.js';
import { serverAutocomplete } from '../../lib/cmd/Autocomplete.js';
import { buildList, guildOwnersCheck, modReply, performBulkAction, validUser } from '../../lib/cmd/ModHelper.js';
import { CubeStorage } from '../../lib/db/Storage.js';
import { EmoteCache } from '../../lib/emote/EmoteCache.js';
import { allRoles, rolePermissionCheck } from '../../lib/http/RoleManager.js';
import strings from '../../res/strings.json' assert { type: 'json' };

/**
 * Cubemoji Moderation!
 * This is a complicated section involving a lot of persistent state
 * and user prompts. Additionally, there is currently an issue with Permissions
 * that is being worked around through Guards. See https://gitlab.com/cubismod/cubemoji/-/issues/27
 */

@Discord()
// @Permission(false)
// @Permission(await OwnerCheck())
// @Permission(await ModOwnerCheck())
@SlashGroup({
  name: 'mod',
  description: 'moderation functionality for the bot',
  dmPermission: false
})
// extremely consistent options requirements very good discord.ts
@SlashGroup('mod')
export abstract class Mod {
  private git = container.resolve(GitClient);
  private storage = container.resolve(CubeStorage);

  @Slash({ name: 'help', description: 'find out how to use cubemoji' })
  async help(
    interaction: CommandInteraction
  ) {
    const helpEmbed = new EmbedBuilder()
      .setTitle('Moderation Help')
      .setDescription(strings.modIntro)
      .setColor(Colors.Gold);
    await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
  }

  @Slash({
    name: 'allroles',
    description: 'Get a list of all roles on this server!'
  })
  async allRolesCmd(
    interaction: CommandInteraction
  ) {
    await interaction.deferReply();
    if (interaction.guildId) {
      const tempFile = await allRoles(interaction.guildId);
      if (tempFile) {
        await interaction.editReply({
          files: [
            new AttachmentBuilder(tempFile)
          ]
        });
        await rm(tempFile);
      }
    }
  }

  @Slash({
    name: 'rolepickstatus',
    description: 'Enable or disable Role Picker'
  })
  async rolePickStatus(
    @SlashOption({
      name: 'server',
      description: 'server of which to enable/disable for',
      autocomplete: (interaction: AutocompleteInteraction) => serverAutocomplete(interaction),
      type: ApplicationCommandOptionType.String
    }) server: string,
    @SlashOption({
      name: 'setstatus',
      description: 'enable or disable the Role Picker on this server',
      type: ApplicationCommandOptionType.Boolean
    }) setStatus: boolean,
      interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const guildInfo = await validUser(interaction.user, server, interaction.client);

    if (guildInfo && interaction.guildId) {
      // perform action
      const curVal = await this.storage.rolePickers.get(guildInfo[0]);
      if (curVal) {
        await this.storage.rolePickers.set(guildInfo[0], [setStatus, curVal[1]]);
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({
              description: `Role Picker State for ${guildInfo[1]} is now ${setStatus}`,
              color: Colors.Blue
            })
          ]
        });
      } else {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({
              description: 'No Role Picker is defined for this server. Please refer to the docs at https://cubemoji.art',
              color: Colors.Red
            })
          ]
        });
      }
    }
  }

  @Slash({
    name: 'rolereload',
    description: 'Reload Role Picker configuration'
  })
  async roleReload(interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const guildInfo = await validUser(interaction.user, interaction.guildId, interaction.client);
    if (guildInfo && interaction.guildId) {
      const res = await this.git.pull();
      const rolePermission = await rolePermissionCheck(interaction.guildId, interaction.client);
      if (res && rolePermission) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({ description: res, color: Colors.Aqua })
          ]
        });
      } else {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({ description: 'Bot may not have permissions to edit roles on this server. Ensure that it has the MANAGE ROLES permission on this server.', color: Colors.Red })
          ]
        });
      }
    }
  }
}

@Discord()
@SlashGroup({ description: 'enroll the bot into big server mode', name: 'enrollment', root: 'mod' })
@SlashGroup('enrollment', 'mod')
export abstract class Enrollment {
  enrollment = container.resolve(CubeStorage).serverEnrollment;
  serverAudit = container.resolve(CubeStorage).serverAuditInfo;
  serverOwnerMsg = 'Only server owners can modify this setting';

  /**
   * Only server owners can enroll/unenroll a server from the mode.
   */
  @Slash({
    name: 'modify',
    description: 'enroll/unenroll a new server into big server mode'
  })
  async modify(
    @SlashChoice('enroll')
    @SlashChoice('unenroll')
    @SlashOption({
      name: 'action',
      type: ApplicationCommandOptionType.String,
      description: 'enroll or unenroll a server'
    }) action: string,
    @SlashOption({
      name: 'server',
      description: 'name of server you want to enroll/unenroll',
      autocomplete: (interaction: AutocompleteInteraction) => serverAutocomplete(interaction),
      type: ApplicationCommandOptionType.String
    }) server: string, interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true });
    const guildInfo = await guildOwnersCheck(interaction.user.id, server, interaction.client);
    if (guildInfo) {
      // user triggering command has permissions to use it
      if (action === 'enroll') {
        await this.enrollment.set(guildInfo[0], interaction.user.tag);
        await modReply(interaction, guildInfo[1], true, 'enroll', '', guildInfo[0]);
      } else {
        await this.enrollment.delete(guildInfo[0]);
        await modReply(interaction, guildInfo[1], true, 'unenroll', '', guildInfo[0]);
      }
    } else {
      await modReply(interaction, 'Error!', false, 'modify enrollment', this.serverOwnerMsg);
    }
  }

  @Slash({
    name: 'joinlogs',
    description: 'enable or disable join logs for the current server'
  })
  async joinlogs(
    @SlashOption({
      name: 'status',
      type: ApplicationCommandOptionType.Boolean,
      description: 'enable or disable logs',
      required: true
    }) status: boolean, interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true });
    const guildInfo = await guildOwnersCheck(interaction.user.id, interaction.guildId, interaction.client);
    if (guildInfo && interaction.guildId) {
      const existing = await this.serverAudit.get(interaction.guildId);
      if (existing && existing.auditChannel) {
        await this.serverAudit.set(interaction.guildId, {
          auditChannel: existing.auditChannel,
          auditingStatus: existing.auditingStatus,
          joinLogs: status
        });
        await modReply(interaction, guildInfo[1], true, `set join logs for this server to ${status}`, `Logs will be sent to <#${existing.auditChannel}>`);
      } else {
        await modReply(interaction, guildInfo[1], false, 'You need to set an audit channel first using the `/mod enrollment audit` command', this.serverOwnerMsg);
      }
    } else {
      await modReply(interaction, 'Error!', false, 'update join log status', this.serverOwnerMsg);
    }
  }

  /**
   * limited to server owners
   */
  @Slash({
    name: 'audit',
    description: 'set a channel to log changes made to permissions'
  })
  async audit(
    @SlashOption(
      {
        name: 'clear',
        description: 'remove audit channel',
        type: ApplicationCommandOptionType.Boolean,
        required: false
      }) clear: boolean,
    @SlashOption({
      name: 'channel',
      description: 'channel to log actions to, cubemoji must have write permission here',
      type: ApplicationCommandOptionType.Channel,
      required: false
    }) channel: TextChannel | VoiceChannel, interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true });
    const guildInfo = await guildOwnersCheck(interaction.user.id, interaction.guildId, interaction.client);
    if (guildInfo) {
      const key = interaction.guildId;
      if (clear && key) {
        // get existing value
        const existing = await this.serverAudit.get(key);
        if (existing) {
          // then just set the flag to false there
          await this.serverAudit.set(key, {
            auditChannel: existing.auditChannel,
            auditingStatus: false,
            joinLogs: existing.joinLogs
          });
        }
        await modReply(interaction, guildInfo[1], true, 'clear audit channel', '', guildInfo[0]);
      } else if (channel && key && channel instanceof TextChannel) {
        await this.serverAudit.set(key, {
          auditChannel: channel.id,
          auditingStatus: true,
          joinLogs: false
        });
        await modReply(interaction, guildInfo[1], true, 'set new audit channel', `Set to <#${channel.id}>`, guildInfo[0]);
      } else {
        await interaction.editReply({ content: `${process.env.CM_BROKEN} Command failure or no options specified!\n**Command Usage**: Set an audit channel to log all changes to cubemoji settings.` });
      }
    } else {
      await modReply(interaction, 'Error!', false, 'change audit settings', this.serverOwnerMsg);
    }
  }

  /**
   * limited to server owners
   */
  @Slash({
    name: 'rolemod',
    description: 'grant/revoke a role moderation perms'
  })
  async roleMod(
    @SlashChoice('grant')
    @SlashChoice('revoke')
    @SlashOption({
      name: 'action',
      description: 'grant or revoke a permission',
      type: ApplicationCommandOptionType.String
    }) action: string,
    @SlashOption({
      name: 'role',
      description: 'role to grant/remove mod permissions',
      type: ApplicationCommandOptionType.Role
    }) role: Role, interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true });
    const guildInfo = await guildOwnersCheck(interaction.user.id, interaction.guildId, interaction.client);
    if (guildInfo) {
      const modEnrollment = container.resolve(CubeStorage).modEnrollment;
      // keys are guildId_roleId
      // see Client.ts where we run a sync of perms every 30 min
      const key = guildInfo[0] + '-' + role.id;
      const notice = 'May take up to 30 min for permissions to sync.';
      if (action === 'grant') {
        await modEnrollment.set(key, role.name);
        await modReply(interaction, guildInfo[1], true, `grant ${role.name} mod perms`, notice, guildInfo[0]);
      } else {
        await modEnrollment.delete(key);
        await modReply(interaction, guildInfo[1], true, `revoke ${role.name} mod perms`, notice, guildInfo[0]);
      }
    } else {
      await modReply(interaction, 'Error!', false, 'modify moderation permissions', this.serverOwnerMsg);
    }
  }

  /**
   * displays servers that the user has access to as a server owner
   * or being part of a moderation group
   */
  @Slash({
    name: 'list',
    description: 'list servers currently enrolled in big server mode as well as moderator roles'
  })
  async list(
    interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true });
    await new Pagination(
      interaction,
      [
        {
          embeds: await buildList(interaction, ['servers', 'mods'])
        }
      ]
    ).send();
  }
}

async function guildErrorFinish(interaction: CommandInteraction, guildName: string | undefined, target: string, action: string) {
  return await modReply(interaction,
    interaction.guild?.name, false,
    `${action} glob \`${target}\``,
    'You don\'t have access to modify this guild');
}

@Discord()
@SlashGroup({ name: 'blocklist', root: 'mod', description: 'block emoji/channel usage' })
@SlashGroup('blocklist', 'mod')
export abstract class blocklist {
  emoteCache = container.resolve(EmoteCache);
  storage = container.resolve(CubeStorage);

  /**
   * command only runs for those w/ mod or server owner perms
   */
  @Slash({
    name: 'modify',
    description: 'block/unblock emoji glob or channel'
  })
  async modify(
    @SlashChoice('block')
    @SlashChoice('unblock')
    @SlashOption({
      name: 'action',
      type: ApplicationCommandOptionType.String,
      description: 'block or unblock'
    }) action: string,
    @SlashOption({
      name: 'server',
      description: 'name of server you want to block emoji on, not req for channel',
      autocomplete: (interaction: AutocompleteInteraction) => serverAutocomplete(interaction),
      type: ApplicationCommandOptionType.String,
      required: false
    }) server: string,
    @SlashOption({
      name: 'glob',
      description: '<21 chars, glob syntax to block emoji, see /mod help fmi',
      type: ApplicationCommandOptionType.String,
      required: false
    }) glob: string,
    @SlashOption({
      name: 'channel',
      type: ApplicationCommandOptionType.Channel,
      description: 'channel that cubemoji is blocked from interacting in',
      required: false
    }) channel: TextChannel | VoiceChannel, interaction: CommandInteraction) {
    // first determine what the end user is trying to do
    // block an emoji glob?
    // block a channel?
    // learn how to use command?
    await interaction.deferReply({ ephemeral: true });
    if (glob && glob.length < 21) {
      let blockedGuild = '';
      // emoji entered
      if (!server) {
        // implicit that the user wants to block the emoji on the server that they are on
        blockedGuild = interaction.guildId ?? blockedGuild;
      } else blockedGuild = server;
      // check that user can make changes to this guild
      const guildInfo = await validUser(interaction.user, blockedGuild, interaction.client);
      if (guildInfo) {
        // user at this point has been confirmed to have permissions
        let blocked = true;
        if (action === 'unblock') blocked = false;
        const success = await this.emoteCache.modifyBlockedEmoji(glob, guildInfo[0], blocked, true);
        if (success) await modReply(interaction, guildInfo[1], success, `${action} glob \`${glob}\``, '', guildInfo[0]);
      } else await guildErrorFinish(interaction, interaction.guild?.name, glob, action);
    }
    if (channel) {
      // user wants to block channel
      // check that user can make changes to guild
      const guildInfo = await validUser(interaction.user, channel.guildId, interaction.client);
      if (guildInfo) {
        if (action === 'block') {
          await this.storage.blockedChannels.set(channel.id, {
            channelName: channel.name,
            guildId: channel.guildId,
            guildName: channel.guild.name
          });
        } else {
          await this.storage.blockedChannels.delete(channel.id);
        }
        await modReply(interaction, channel.guild.name, true, `${action} #${channel.name}`, `Linked version<#${channel.id}>`, guildInfo[0]);
      }
    }
    if (!glob && !channel) {
      // display a help message
      await interaction.editReply({
        content: '**Usage**: If you want to block an emoji on a server, then enter a glob following this syntax <https://github.com/micromatch/micromatch#matching-features>. Optionally enter a server to block this string on that particular server, otherwise we assume you want to block the emoji on this current server.\nIf you want to block cubemoji interactions in a specific channel, then enter an option in channel which will autofill with channels on the current server you\'re on.'
      });
    }
  }

  /**
   * only display permissions that user is scoped to see
   */
  @Slash({
    name: 'list',
    description: 'list blocked emoji and channels'
  })
  async list(
    interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true });
    await new Pagination(
      interaction,
      [
        {
          embeds: await buildList(interaction, ['emoji', 'channels'])
        }
      ]
    ).send();
  }

  /**
   * checks in place to ensure that each bulk action can be performed by the user in question
   */
  @Slash({
    name: 'bulk',
    description: 'perform bulk blocking/unblocking of globs and channels'
  })
  async bulk(
    @SlashOption({
      name: 'listlink',
      description: 'publicly available plaintext link following bulk syntax, (see wiki for details)',
      required: true,
      type: ApplicationCommandOptionType.String
    })
      listLink: string,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true });
    await performBulkAction(interaction, listLink);
  }
}
