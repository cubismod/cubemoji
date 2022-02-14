// Various server configuration commands

import { Pagination } from '@discordx/pagination'
import { AutocompleteInteraction, CommandInteraction } from 'discord.js'
import { Discord, Guard, Slash, SlashGroup, SlashOption } from 'discordx'
import { container } from 'tsyringe'
import { serverAutocomplete } from '../../util/Autocomplete'
import { validateServerOwner } from '../../util/DiscordLogic'
import { logManager } from '../../util/LogManager'
import { CubeStorage } from '../../util/Storage'
import { OwnerCheck } from '../Guards'

interface enrolledServer {
  value: string, // user tag
  expires: null
}

async function reply (interaction: CommandInteraction, serverName = '', success: boolean, action: string) {
  if (success) await interaction.editReply(`✅ Successfully **${action}ed** "${serverName}" in big server mode.`)
  else await interaction.editReply(`❌ Could not **${action}** server in big server mode. You may be not be the owner or identifier was invalid.`)
}

@Discord()
@SlashGroup({ description: 'allows bot and server owners to modify big server mode', name: 'enrollment' })
export abstract class Enrollment {
  logger = logManager().getLogger('ServerConfig')
  @Guard(OwnerCheck)
  @Slash('enroll', { description: 'enroll a new server into big server mode' })
  @SlashGroup({ name: 'enrollment' })
  async enroll (
      @SlashOption('server', {
        description: 'name of server you want to enroll',
        autocomplete: (interaction: AutocompleteInteraction) => serverAutocomplete(interaction),
        type: 'STRING'
      }) server: string,
        interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true })
    const guildInfo = await validateServerOwner(interaction.user.id, server, interaction.client)
    if (guildInfo) {
      const enrollment = container.resolve(CubeStorage).enrollment
      await enrollment.set(guildInfo[0], interaction.user.tag)
      this.logger.info(`${interaction.user.tag} enrolled [${guildInfo}] in big server mode.`)
      await reply(interaction, guildInfo[1], true, 'enroll')
    } else {
      await reply(interaction, undefined, false, 'enroll')
    }
  }

  @Guard(OwnerCheck)
  @Slash('unenroll', { description: 'unenroll a new server from big server mode' })
  @SlashGroup({ name: 'enrollment' })
  async unenroll (
      @SlashOption('server', {
        description: 'name of server you want to enroll',
        autocomplete: (interaction: AutocompleteInteraction) => serverAutocomplete(interaction),
        type: 'STRING'
      }) server: string,
        interaction: CommandInteraction
  ) {
    this.logger.info(interaction.deferred)
    await interaction.deferReply({ ephemeral: true })
    const guildInfo = await validateServerOwner(interaction.user.id, server, interaction.client)
    if (guildInfo) {
      const enrollment = container.resolve(CubeStorage).enrollment
      await enrollment.delete(guildInfo[0])
      this.logger.info(`${interaction.user.tag} unenrolled [${guildInfo}] from big server mode.`)
      await reply(interaction, guildInfo[1], true, 'unenroll')
    } else {
      await reply(interaction, undefined, false, 'unenroll')
    }
  }

  @Guard(OwnerCheck)
  @Slash('list', { description: 'list servers currently enrolled in big server mode' })
  @SlashGroup({ name: 'enrollment' })
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
