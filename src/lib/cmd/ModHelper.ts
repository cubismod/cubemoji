// helper commands for Moderation group

import { Client, CommandInteraction, MessageEmbed } from 'discord.js'
import { container } from 'tsyringe'
import { CubeStorage } from '../db/Storage'
import { logManager } from '../LogManager'

const logger = logManager().getLogger('ServerConfig')

/**
 * returns Discord obtained guild id & name if the user
 * owns the server specified or else undefined
 * checks against the discord api as well
 * @param userId id of user we are checking
 * @param identifier name or id of guild we are checking
 * @param client Discord client
 * @returns [guild ID, guild name] or undefined
 */
export async function guildOwnersCheck (userId: string, identifier: string | null, client: Client) {
  const serverOwners = container.resolve(CubeStorage).serverOwners
  const servers = await serverOwners.get(userId)
  let serverId = ''

  if (servers) {
    for (const server of servers) {
      // find a server that matches
      if (server.id === identifier || server.name === identifier) {
        serverId = server.id
        break
      }
    }
  }

  // then fully validate with discord
  const discResolved = client.guilds.resolve(serverId)
  if (discResolved && discResolved.ownerId === userId) {
    return [discResolved.id, discResolved.name]
  } else {
    return undefined
  }
}

/**
 * reply with an embed to indicate status of action
 * @param interaction discord interaction which should be deferred
 * @param serverName aka guild name
 * @param success result of action
 * @param action something like 'enroll', 'unenroll', etc.
 * @param notes add'l notes to include for user
 */
export async function reply (interaction: CommandInteraction, serverName = '', success: boolean, action: string, notes = '') {
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
  await interaction.editReply({ embeds: [embed] })
  logger.info(`Action: ${action}| Success: ${success} | Server: ${serverName} | Invoker: ${interaction.user.tag}`)
}
