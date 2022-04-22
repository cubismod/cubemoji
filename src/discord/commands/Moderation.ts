// Various server configuration commands

import { Pagination } from '@discordx/pagination';
import { AutocompleteInteraction, CommandInteraction, MessageEmbed, Role, TextChannel, VoiceChannel } from 'discord.js';
import { Discord, Permission, Slash, SlashChoice, SlashGroup, SlashOption } from 'discordx';
import { container } from 'tsyringe';
import { serverAutocomplete } from '../../lib/cmd/Autocomplete';
import { buildList, guildOwnersCheck, reply, validUser } from '../../lib/cmd/ModHelper';
import { CubeStorage } from '../../lib/db/Storage.js';
import { EmoteCache } from '../../lib/emote/EmoteCache.js';
import strings from '../../res/strings.json' assert { type: 'json' };
import { ModOwnerCheck } from '../Permissions';

@Discord()
@Permission(false)
// @Permission(await OwnerCheck())
@Permission(await ModOwnerCheck())
@SlashGroup({ name: 'mod', description: 'moderation functionality for the bot' })
@SlashGroup('mod')
export abstract class Mod {
  @Permission(false)
  // @Permission(await OwnerCheck())
  // @Permission(await ModCheck())
  @Slash('help')
  async help(
    interaction: CommandInteraction
  ) {
    const helpEmbed = new MessageEmbed()
      .setTitle('Moderation Help')
      .setDescription(strings.modIntro)
      .setColor('GOLD');
    await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
  }
}

@Discord()
@SlashGroup({ name: 'enrollment', root: 'mod' })
@SlashGroup('enrollment', 'mod')
export abstract class Enrollment {
  enrollment = container.resolve(CubeStorage).serverEnrollment;
  serverAudit = container.resolve(CubeStorage).serverAuditInfo;
  serverOwnerMsg = 'Only server owners can modify this setting';

  @Slash('modify', { description: 'enroll/unenroll a new server into big server mode' })
  async modify(
    @SlashChoice('enroll', 'enroll')
    @SlashChoice('unenroll', 'unenroll')
    @SlashOption('action') action: string,
    @SlashOption('server', {
      description: 'name of server you want to enroll/unenroll',
      autocomplete: (interaction: AutocompleteInteraction) => serverAutocomplete(interaction),
      type: 'STRING'
    }) server: string, interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true });
    const guildInfo = await guildOwnersCheck(interaction.user.id, server, interaction.client);
    if (guildInfo) {
      // user triggering command has permissions to use it
      if (action === 'enroll') {
        await this.enrollment.set(guildInfo[0], interaction.user.tag);
        await reply(interaction, guildInfo[1], true, 'enroll', '', guildInfo[0]);
      } else {
        await this.enrollment.delete(guildInfo[0]);
        await reply(interaction, guildInfo[1], true, 'unenroll', '', guildInfo[0]);
      }
    } else {
      await reply(interaction, 'Error!', false, 'modify enrollment', this.serverOwnerMsg);
    }
  }

  @Slash('audit', { description: 'set a channel to log changes made to permissions' })
  async audit(
    @SlashOption('clear', { description: 'remove audit channel', type: 'BOOLEAN', required: false }) clear: boolean,
    @SlashOption('channel', { description: 'channel to log actions to, cubemoji must have write permission here', type: 'CHANNEL', required: false }) channel: TextChannel | VoiceChannel, interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true });
    const guildInfo = await guildOwnersCheck(interaction.user.id, interaction.guildId, interaction.client);
    if (guildInfo) {
      const key = interaction.guildId;
      if (clear && key) {
        await this.serverAudit.delete(key);
        await reply(interaction, guildInfo[1], true, 'clear audit channel', '', guildInfo[0]);
      } else if (channel && key && channel instanceof TextChannel) {
        await this.serverAudit.set(key, channel.id);
        await reply(interaction, guildInfo[1], true, 'set new audit channel', `Set to <#${channel.id}>`, guildInfo[0]);
      } else {
        await interaction.editReply({ content: `${process.env.CM_BROKEN} Command failure or no options specified!\n**Command Usage**: Set an audit channel to log all changes to cubemoji settings.` });
      }
    } else {
      await reply(interaction, 'Error!', false, 'change audit settings', this.serverOwnerMsg);
    }
  }

  @Slash('rolemod', { description: 'grant/revoke a role moderation perms' })
  async roleMod(
    @SlashChoice('grant', 'grant')
    @SlashChoice('revoke', 'revoke')
    @SlashOption('action') action: string,
    @SlashOption('role', {
      description: 'role to grant/remove mod permissions',
      type: 'ROLE'
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
        await reply(interaction, guildInfo[1], true, `grant ${role.name} mod perms`, notice, guildInfo[0]);
      } else {
        await modEnrollment.delete(key);
        await reply(interaction, guildInfo[1], true, `revoke ${role.name} mod perms`, notice, guildInfo[0]);
      }
    } else {
      await reply(interaction, 'Error!', false, 'modify moderation permissions', this.serverOwnerMsg);
    }
  }

  @Slash('list', { description: 'list servers currently enrolled in big server mode as well as moderator roles' })
  async list(
    interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true });
    new Pagination(
      interaction,
      await buildList(interaction, ['servers', 'mods'])
    ).send();
  }
}

async function guildErrorFinish(interaction: CommandInteraction, guildName: string | undefined, target: string, action: string) {
  return await reply(interaction,
    interaction.guild?.name, false,
    `${action} glob \`${target}\``,
    'You don\'t have access to modify this guild');
}

@Discord()
@SlashGroup({ name: 'blacklist', root: 'mod' })
@SlashGroup('blacklist', 'mod')
export abstract class Blacklist {
  emoteCache = container.resolve(EmoteCache);
  storage = container.resolve(CubeStorage);

  @Slash('modify', { description: 'block/unblock emoji glob or channel' })
  async modify(
    @SlashChoice('block', 'block')
    @SlashChoice('unblock', 'unblock')
    @SlashOption('action') action: string,
    @SlashOption('server', {
      description: 'name of server you want to block emoji on, not req for channel',
      autocomplete: (interaction: AutocompleteInteraction) => serverAutocomplete(interaction),
      type: 'STRING',
      required: false
    }) server: string,
    @SlashOption('glob', {
      description: '<21 chars, glob syntax to block emoji, see /mod help fmi',
      type: 'STRING',
      required: false
    }) glob: string,
    @SlashOption('channel', { type: 'CHANNEL', description: 'channel that cubemoji is blocked from interacting in', required: false }) channel: TextChannel | VoiceChannel, interaction: CommandInteraction) {
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
        const success = await this.emoteCache.modifyBlockedEmoji(glob, guildInfo[0], blocked);
        if (success) await reply(interaction, guildInfo[1], success, `${action} glob \`${glob}\``, '', guildInfo[0]);
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
        await reply(interaction, channel.guild.name, true, `${action} #${channel.name}`, `Linked version<#${channel.id}>`, guildInfo[0]);
      }
    }
    if (!glob && !channel) {
      // display a help message
      await interaction.editReply({
        content: '**Usage**: If you want to block an emoji on a server, then enter a glob following this syntax <https://github.com/micromatch/micromatch#matching-features>. Optionally enter a server to block this string on that particular server, otherwise we assume you want to block the emoji on this current server.\nIf you want to block cubemoji interactions in a specific channel, then enter an option in channel which will autofill with channels on the current server you\'re on.'
      });
    }
  }

  @Slash('list', { description: 'list blocked emoji and channels' })
  async list(
    interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true });
    new Pagination(
      interaction,
      await buildList(interaction, ['emoji', 'channels'])
    ).send();
  }
}
