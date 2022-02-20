// Various server configuration commands

import { Pagination } from '@discordx/pagination'
import { AutocompleteInteraction, CommandInteraction, MessageEmbed, SnowflakeUtil, TextChannel, VoiceChannel } from 'discord.js'
import { Discord, Permission, Slash, SlashChoice, SlashGroup, SlashOption } from 'discordx'
import pkg from 'micromatch'
import { container } from 'tsyringe'
import { serverAutocomplete } from '../../lib/cmd/Autocomplete'
import { CubeStorage } from '../../lib/db/Storage'
import { EmoteCache } from '../../lib/emote/EmoteCache'
import { guildOwnersCheck } from '../../lib/image/DiscordLogic'
import { logManager } from '../../lib/LogManager'
import strings from '../../res/strings.json'
import { OwnerCheck } from '../Permissions'
const { parse } = pkg

interface enrolledServer {
  value: string, // user tag
  expires: null
}

/**
 * reply with an embed to indicate status of action
 * @param interaction discord interaction which should be deferred
 * @param serverName aka guild name
 * @param success result of action
 * @param action something like 'enroll', 'unenroll', etc.
 * @param notes add'l notes to include for user
 */
async function reply (interaction: CommandInteraction, serverName = '', success: boolean, action: string, notes = '') {
  const embed = new MessageEmbed({
    title: `Action: ${action}`,
    fields: [
      {
        name: 'Server Name',
        value: serverName
      },
      {
        name: 'Status',
        value: success ? 'Success' : 'Failure'
      }
    ],
    color: success ? 'GREEN' : 'RED',
    footer: {
      text: 'cubemoji moderation tools'
    }
  })
  if (notes !== '') embed.addField('Notes', notes)
  interaction.editReply({ embeds: [embed] })
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
      const enrollment = container.resolve(CubeStorage).enrollment
      if (action === 'enroll') {
        await enrollment.set(guildInfo[0], interaction.user.tag)
        this.logger.info(`${interaction.user.tag} enrolled [${guildInfo}] in big server mode.`)
        await reply(interaction, guildInfo[1], true, 'enroll')
      } else {
        await enrollment.delete(guildInfo[0])
        await reply(interaction, guildInfo[1], true, 'unenroll')
        this.logger.info(`${interaction.user.tag} unenrolled [${guildInfo}] from big server mode.`)
      }
    } else {
      await reply(interaction, undefined, false, 'modify enrollment for')
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

@Discord()
@Permission(false)
@Permission(await OwnerCheck)
@SlashGroup({ name: 'blacklist', root: 'mod' })
@SlashGroup('blacklist', 'mod')
export abstract class Blacklist {
  logger = logManager().getLogger('ServerConfig')
  emoteCache = container.resolve(EmoteCache)
  storage = container.resolve(CubeStorage)

  @Slash('emojimod', { description: 'block/unblock an emoji on a specified server that you own' })
  async emojiMod (
    @SlashChoice('block', 'block')
    @SlashChoice('unblock', 'unblock')
    @SlashOption('action') action: string,
    @SlashOption('server', {
      description: 'name of server you want to block emoji on',
      autocomplete: (interaction: AutocompleteInteraction) => serverAutocomplete(interaction),
      type: 'STRING'
    }) server: string,
    @SlashOption('emoji', {
      description: 'glob syntax to block emoji, see /mod help fmi',
      type: 'STRING'
    }) emoji: string,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true })
    const guildInfo = await guildOwnersCheck(interaction.user.id, server, interaction.client)
    // validate the glob expression
    const parsed = parse(emoji)
    if (guildInfo && interaction.guildId && interaction.guild && emoji.length < 25 && parsed) {
      // db key made of the guildID_randomsnowflake
      const key = guildInfo[0] + '_' + SnowflakeUtil.generate()

      if (action === 'block') {
        if (this.emoteCache.modifyBlockedEmoji(emoji, guildInfo[0], true)) {
          // success
          await this.storage.emojiBlocked.set(key, emoji)
          await reply(interaction, guildInfo[1], true, `block \`${emoji}\``)
        } else await reply(interaction, guildInfo[1], false, `block \`${emoji}\``)
      } else {
        this.emoteCache.modifyBlockedEmoji(emoji, guildInfo[0], false)
        await this.storage.emojiBlocked.delete(key)
        await reply(interaction, guildInfo[1], true, `unblocked \`${emoji}\``)
      }
    } else if (guildInfo) {
      await reply(interaction, guildInfo[1], false, `modify \`${emoji}\``, 'cubemoji uses [micromatch globbing syntax](https://github.com/micromatch/micromatch#matching-features)')
    }
  }

  @Slash('channelmod', { description: 'block unblock cubemoji interactions from a channel' })
  async channelMod (
    @SlashChoice('block', 'block')
    @SlashChoice('unblock', 'unblock')
    @SlashOption('action') action: string,
    @SlashOption('channel', { type: 'CHANNEL' }) channel: TextChannel | VoiceChannel,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true })
    await interaction.guild?.fetch()
    if (channel instanceof TextChannel && interaction.guildId && await guildOwnersCheck(interaction.user.id, interaction.guildId, interaction.client)) {
      const storage = container.resolve(CubeStorage)
      const guildName = interaction.guild?.name ?? '<no server name found>'
      const guildId = interaction.guildId ?? ''

      if (action === 'block') {
        await storage.blockedChannels.set(channel.id, {
          channelName: channel.name,
          guildId: guildId,
          guildName: guildName
        })
        this.logger.info(`#${channel.name} has been added to blocked channels list from ${guildName}`)
      } else {
        await storage.blockedChannels.delete(channel.id)
        this.logger.info(`#${channel.name} has been removed from blocked channels list in ${guildName}`)
      }
      await reply(interaction, interaction.guild?.name, true, `${action} \`#${channel.name}\``)
    } else {
      await interaction.editReply({ content: 'Command failed. Cubemoji does\'t do anything in voice channels so you can\'t block those. Additionally, you may not have permission to perform this command.' })
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
    const guildInfo = await guildOwnersCheck(interaction.user.id, server, interaction.client)
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
