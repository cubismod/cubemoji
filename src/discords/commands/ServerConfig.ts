// Various server configuration commands

import { AutocompleteInteraction, CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashGroup, SlashOption } from 'discordx'
import { container } from 'tsyringe'
import { serverAutocomplete } from '../../util/Autocomplete'
import { validateServerOwner } from '../../util/DiscordLogic'
import { logManager } from '../../util/LogManager'
import { CubeStorage } from '../../util/Storage'

async function reply (interaction: CommandInteraction, serverName = '', success: boolean, action: string) {
  if (success) await interaction.editReply(`✅ Successfully **${action}ed** "${serverName}" in big server mode.`)
  else await interaction.editReply(`❌ Could not **${action}** server in big server mode. You may be not be the owner or identifier was invalid.`)
}

@Discord()
@SlashGroup({ description: 'Pare down bot functionality for larger servers', name: 'serverconfig' })
@SlashGroup('enrollment', { description: 'allows bot and server owners to enable mode' })
export abstract class Enrollment {
  logger = logManager().getLogger('ServerConfig')
  @Slash('enroll', { description: 'enroll a new server into big server mode' })
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
      await enrollment.set(guildInfo[0], '')
      this.logger.info(`${interaction.user.username} enrolled [${guildInfo}] in big server mode.`)
      await reply(interaction, guildInfo[1], true, 'enroll')
    } else {
      await reply(interaction, undefined, false, 'enroll')
    }
  }

  @Slash('unenroll', { description: 'unenroll a new server from big server mode' })
  async unenroll (
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
      await enrollment.delete(guildInfo[0])
      this.logger.info(`${interaction.user.username} unenrolled [${guildInfo}] from big server mode.`)
      await reply(interaction, guildInfo[1], true, 'unenroll')
    } else {
      await reply(interaction, undefined, false, 'unenroll')
    }
  }
}
