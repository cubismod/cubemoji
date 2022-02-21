// Various server configuration commands

import { Pagination } from '@discordx/pagination'
import { AutocompleteInteraction, CommandInteraction, MessageEmbed, Role, TextChannel, VoiceChannel } from 'discord.js'
import { Discord, Permission, Slash, SlashChoice, SlashGroup, SlashOption } from 'discordx'
import { container } from 'tsyringe'
import { serverAutocomplete } from '../../lib/cmd/Autocomplete'
import { guildOwnersCheck, reply, validUser } from '../../lib/cmd/ModHelper'
import { CubeStorage } from '../../lib/db/Storage'
import { EmoteCache } from '../../lib/emote/EmoteCache'
import { logManager } from '../../lib/LogManager'
import strings from '../../res/strings.json'
import { OwnerCheck } from '../Permissions'

interface enrolledServer {
  value: string, // user tag
  expires: null
}

@Discord()
@Permission(false)
@Permission(await OwnerCheck)
@SlashGroup({ name: 'mod', description: 'moderation functionality for the bot' })
@SlashGroup('moderation')
export abstract class Mod {
  @Slash('help')
  async help (
    interaction: CommandInteraction
  ) {
    const helpEmbed = new MessageEmbed()
      .setTitle('Moderation Help')
      .setDescription(strings.modIntro)
      .addField('Enrollment', strings.modEnrollment)
      .addField('Blacklist', strings.modBlacklist)
      .addField('Commands', `\`\`\`
-> Enrollment
--* modify
--* list
-> Blacklist
--* emojimod
--* channelmod
--* list\`\`\``)
      .setColor('GOLD')
    await interaction.reply({ embeds: [helpEmbed], ephemeral: true })
  }
}

@Discord()
@Permission(false)
@Permission(await OwnerCheck)
@SlashGroup({ name: 'enrollment', root: 'mod' })
@SlashGroup('enrollment', 'mod')
export abstract class Enrollment {
  logger = logManager().getLogger('ServerConfig')

  @Slash('modify', { description: 'enroll/unenroll a new server into big server mode' })
  async modify (
      @SlashChoice('enroll', 'enroll')
      @SlashChoice('unenroll', 'unenroll')
      @SlashOption('action') action: string,
      @SlashOption('server', {
        description: 'name of server you want to enroll/unenroll',
        autocomplete: (interaction: AutocompleteInteraction) => serverAutocomplete(interaction),
        type: 'STRING'
      }) server: string,
        interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true })
    const guildInfo = await guildOwnersCheck(interaction.user.id, server, interaction.client)
    if (guildInfo) {
      // user triggering command has permissions to use it
      const enrollment = container.resolve(CubeStorage).serverEnrollment
      if (action === 'enroll') {
        await enrollment.set(guildInfo[0], interaction.user.tag)
        await reply(interaction, guildInfo[1], true, 'enroll')
      } else {
        await enrollment.delete(guildInfo[0])
        await reply(interaction, guildInfo[1], true, 'unenroll')
      }
    } else {
      await reply(interaction, undefined, false, 'modify enrollment')
    }
  }

  @Slash('rolemod', { description: 'grant/revoke a role moderation perms' })
  async roleMod (
    @SlashChoice('grant', 'grant')
    @SlashChoice('revoke', 'revoke')
    @SlashOption('action') action: string,
    @SlashOption('role', {
      description: 'role to grant/remove mod permissions',
      type: 'ROLE'
    }) role: Role,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true })
    const guildInfo = await guildOwnersCheck(interaction.user.id, interaction.guildId, interaction.client)
    if (guildInfo) {
      const modEnrollment = container.resolve(CubeStorage).modEnrollment
      // keys are guildId_roleId
      // see Client.ts where we run a sync of perms every 30 min
      const key = guildInfo[0] + '_' + role.id
      const notice = 'May take up to 30 min for permissions to sync.'
      if (action === 'enroll') {
        await modEnrollment.set(key, role.name)
        await reply(interaction, guildInfo[1], true, `grant ${role.name} mod perms`, notice)
      } else {
        await modEnrollment.delete(key)
        await reply(interaction, guildInfo[1], true, `revoke ${role.name} mod perms`, notice)
      }
    } else {
      await reply(interaction, undefined, false, 'modify moderation permissions')
    }
  }

  @Slash('list', { description: 'list servers currently enrolled in big server mode' })
  async list (
    interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true })
    const storage = container.resolve(CubeStorage)
    const servers = storage.getNamespace('server')
    if (servers) {
      // we now have a list of servers like so
      // key: servers:server_id
      // value: {"value": "user_tag", "expires": null}
      const paginatedList : string[] = []

      servers.forEach((server, i) => {
        const parsed: enrolledServer = JSON.parse(server.value)
        // remove prefix from result
        const serverId = server.key.replace('servers:', '')
        const guild = interaction.client.guilds.resolve(serverId)
        let guildName = ''
        if (guild) {
          guildName = guild.name
        }
        const text = `**${guildName}**\nServer Owner: "${parsed.value}"\n\n`
        if (i % 10 === 0) {
          // start new page
          paginatedList.push(text)
        } else {
          // otherwise append to last element in array
          const last = paginatedList.splice(-1)
          paginatedList.push(last + text)
        }
      })
      // now we have a list with one entry per server
      // but we want to create a paginated list where each entry
      // is a page and we have 10 servers per page

      new Pagination(interaction, paginatedList).send()
    }
  }
}

async function guildErrorFinish (interaction: CommandInteraction, guildName: string|undefined, target: string, action: string) {
  return await reply(interaction,
    interaction.guild?.name, false,
    `${action} glob \`${target}\``,
    'You don\'t have access to modify this guild')
}

@Discord()
@Permission(false)
@Permission(await OwnerCheck)
@SlashGroup({ name: 'blacklist', root: 'mod' })
@SlashGroup('blacklist', 'mod')
export abstract class Blacklist {
  logger = logManager().getLogger('ServerConfig')
  emoteCache = container.resolve(EmoteCache)
  storage = container.resolve(CubeStorage)

  @Slash('modify', { description: 'block/unblock emoji glob or channel' })
  async modify (
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
  @SlashOption('channel', { type: 'CHANNEL', description: 'channel that cubemoji is blocked from interacting in', required: false }) channel: TextChannel | VoiceChannel,
    interaction: CommandInteraction) {
    // first determine what the end user is trying to do
    // block an emoji glob?
    // block a channel?
    // learn how to use command?
    await interaction.deferReply({ ephemeral: true })
    if (glob && glob.length < 21) {
      let blockedGuild = ''
      // emoji entered
      if (!server) {
        // implicit that the user wants to block the emoji on the server that they are on
        blockedGuild = interaction.guildId ?? blockedGuild
      } else blockedGuild = server
      // check that user can make changes to this guild
      const guildInfo = await validUser(interaction.user, blockedGuild, interaction.client)
      if (guildInfo) {
        // user at this point has been confirmed to have permissions
        let blocked = true
        if (action === 'unblock') blocked = false
        const success = await this.emoteCache.modifyBlockedEmoji(glob, guildInfo[0], blocked)
        if (success) await reply(interaction, guildInfo[1], success, `${action} glob \`${glob}\``)
      } else await guildErrorFinish(interaction, interaction.guild?.name, glob, action)
    }
    if (channel) {
      // user wants to block channel
      // check that user can make changes to guild
      const guildInfo = await validUser(interaction.user, channel.guildId, interaction.client)
      if (guildInfo) {
        if (action === 'block') {
          await this.storage.blockedChannels.set(channel.id, {
            channelName: channel.name,
            guildId: channel.guildId,
            guildName: channel.guild.name
          })
        } else {
          await this.storage.blockedChannels.delete(channel.id)
        }
        await reply(interaction, channel.guild.name, action === 'block', `${action} #${channel.name}`)
      }
    }
    if (!glob && !channel) {
      // display a help message
      await interaction.editReply({
        content: '**Usage**: If you want to block an emoji on a server, then enter a glob following this syntax <https://github.com/micromatch/micromatch#matching-features>. Optionally enter a server to block this string on that particular server, otherwise we assume you want to block the emoji on this current server.\nIf you want to block cubemoji interactions in a specific channel, then enter an option in channel which will autofill with channels on the current server you\'re on.'
      })
    }
  }

  @Slash('list', { description: 'list blocked emoji' })
  async list (
    @SlashOption('server', {
      description: 'name of server you want to block emoji on',
      autocomplete: (interaction: AutocompleteInteraction) => serverAutocomplete(interaction),
      type: 'STRING'
    }) server: string,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true })
    const guildInfo = await validUser(interaction.user, server, interaction.client)
    if (guildInfo) {
      // valid owner so let's see what emoji are blocked on that server
      const blockedEmoji = this.emoteCache.blockedEmoji.get(guildInfo[0])
      if (blockedEmoji) {
        const paginatedList : string[] = [
          `**Blacklisted emoji on ${guildInfo[1]}**\n`
        ]
        let i = 1
        blockedEmoji.forEach((emoji) => {
          if (i % 20 === 0) {
            paginatedList.push(`${emoji}\n`)
          } else {
            const last = paginatedList.splice(-1)
            paginatedList.push(last + `${emoji}\n`)
          }
          i++
        })
        new Pagination(interaction, paginatedList).send()
        return
      }
    }
    await interaction.editReply('No blocked emoji on this server.')
  }
}
