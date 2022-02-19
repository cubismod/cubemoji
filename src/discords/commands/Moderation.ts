// Various server configuration commands

import { Pagination } from '@discordx/pagination'
import { AutocompleteInteraction, CommandInteraction } from 'discord.js'
import { Discord, Guard, Slash, SlashChoice, SlashGroup, SlashOption } from 'discordx'
import { container } from 'tsyringe'
import { serverAutocomplete } from '../../util/Autocomplete'
import { validateServerOwner } from '../../util/DiscordLogic'
import { EmoteCache } from '../../util/EmoteCache'
import { logManager } from '../../util/LogManager'
import { CubeStorage } from '../../util/Storage'
import { OwnerCheck } from '../Guards'

interface enrolledServer {
  value: string, // user tag
  expires: null
}

async function reply (interaction: CommandInteraction, serverName = '', success: boolean, action: string) {
  if (success) await interaction.editReply(`✅ Successfully **${action}** "${serverName}"`)
  else await interaction.editReply(`❌ Could not **${action}** "${serverName}". You may be not be the owner or identifier was invalid.`)
}

@Discord()
@SlashGroup({ name: 'moderation', description: 'setup a less spammy version of the bot for specific servers' })
@SlashGroup({ name: 'enrollment', description: 'allows bot and server owners to modify big server mode', root: 'moderation' })
@SlashGroup('enrollment', 'moderation')
export abstract class Enrollment {
  logger = logManager().getLogger('ServerConfig')

  @Guard(OwnerCheck)
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
    const guildInfo = await validateServerOwner(interaction.user.id, server, interaction.client)
    if (guildInfo) {
      const enrollment = container.resolve(CubeStorage).enrollment
      if (action === 'enroll') {
        await enrollment.set(guildInfo[0], interaction.user.tag)
        this.logger.info(`${interaction.user.tag} enrolled [${guildInfo}] in big server mode.`)
        await reply(interaction, guildInfo[1], true, 'enrolled')
      } else {
        await enrollment.delete(guildInfo[0])
        await reply(interaction, guildInfo[1], true, 'unenrolled')
        this.logger.info(`${interaction.user.tag} unenrolled [${guildInfo}] from big server mode.`)
      }
    } else {
      await reply(interaction, undefined, false, 'modify enrollment for')
    }
  }

  @Guard(OwnerCheck)
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
@SlashGroup({ name: 'blacklist', description: 'blacklist emojis for big server mode', root: 'moderation' })
@SlashGroup('blacklist', 'moderation')
export abstract class Blacklist {
  logger = logManager().getLogger('ServerConfig')
  emoteCache = container.resolve(EmoteCache)
  storage = container.resolve(CubeStorage)

  @Guard(OwnerCheck)
  @Slash('update', { description: 'block/unblock an emoji on a specified server that you own' })
  async update (
    @SlashChoice('block', 'block')
    @SlashChoice('unblock', 'unblock')
    @SlashOption('action') action: string,
    @SlashOption('server', {
      description: 'name of server you want to block emoji on',
      autocomplete: (interaction: AutocompleteInteraction) => serverAutocomplete(interaction),
      type: 'STRING'
    }) server: string,
    @SlashOption('emoji', {
      description: 'emojis including this string in it won\'t work on your server',
      type: 'STRING'
    }) emoji: string,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true })
    const guildInfo = await validateServerOwner(interaction.user.id, server, interaction.client)
    if (guildInfo && interaction.guildId && interaction.guild && emoji.length < 25) {
      const key = guildInfo[0] + '_' + emoji.toLowerCase()
      if (action === 'block') {
        this.emoteCache.modifyBlockedEmoji(emoji.toLowerCase(), guildInfo[0], true)
        await this.storage.emojiBlocked.set(key, '')
        await reply(interaction, guildInfo[1], true, `blocked "${emoji}" in`)
      } else {
        this.emoteCache.modifyBlockedEmoji(emoji.toLowerCase(), guildInfo[0], false)
        await this.storage.emojiBlocked.delete(key)
      }
    } else if (guildInfo) {
      await reply(interaction, guildInfo[1], false, `modify "${emoji} in`)
    }
  }

  @Guard(OwnerCheck)
  @Slash('show', { description: 'list blocked emoji' })
  async show (
    @SlashOption('server', {
      description: 'name of server you want to block emoji on',
      autocomplete: (interaction: AutocompleteInteraction) => serverAutocomplete(interaction),
      type: 'STRING'
    }) server: string,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true })
    const guildInfo = await validateServerOwner(interaction.user.id, server, interaction.client)
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
