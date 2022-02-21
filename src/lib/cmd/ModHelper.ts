// helper commands for Moderation group

import { Client, CommandInteraction, MessageEmbed, User } from 'discord.js'
import { container } from 'tsyringe'
import { ChannelInfo, CubeStorage, ValRaw } from '../db/Storage'
import { logManager } from '../LogManager'

const logger = logManager().getLogger('ServerConfig')

/**
 * @param guildIdentifier guild id from autocomplete
 * @returns regular expression result including the snowflake id
 */
function resolveId (guildIdentifier: string) {
  // should match snowflake-servername
  // just snowflake
  // as well as just snowflake w/ snowflake in group 1
  const re = /(.*?)(-|$)/
  return re.exec(guildIdentifier)
}

/**
 * returns Discord obtained guild id & name if the user
 * owns the server specified or else undefined
 * checks against the discord api as well
 * @param userId id of user we are checking
 * @param guildIdentifier identifier returned from autocomplete function
 * @param client Discord client
 * @returns [guild ID, guild name] or undefined
 */
export async function guildOwnersCheck (userId: string, guildIdentifier: string | null, client: Client) {
  if (guildIdentifier) {
    // extract snowflake from the identifier
    const matches = resolveId(guildIdentifier)
    if (matches) {
      const snowflake = matches[1]
      const resolvedGuild = client.guilds.resolve(snowflake)
      // verify that the guild owner matches the user who invoked the command
      if (resolvedGuild && resolvedGuild.ownerId === userId) {
        return [resolvedGuild.id, resolvedGuild.name]
      }
    }
    return undefined
  }
}

/**
 * validates whether a user has mod permissions by checking their roles
 * against the database
 * @param user user to check roles of
 * @param guildIdentifier name or id of guild we are checking
 * @param client Discord client
 * @returns [guild ID, guild name] or undefined
 */
export async function guildModsCheck (user: User, guildIdentifier: string | null, client: Client) {
  let valid: undefined | [string, string]
  if (guildIdentifier) {
    const matches = resolveId(guildIdentifier)
    if (matches) {
      const snowflake = matches[1]
      const resolvedGuild = client.guilds.resolve(snowflake)
      if (resolvedGuild) {
        // now check roles for the user
        const resolvedMember = resolvedGuild.members.resolve(user)
        if (resolvedMember) {
          // check against database
          const modEnrollment = container.resolve(CubeStorage).modEnrollment
          for (const role of resolvedMember.roles.cache) {
            // check against each role that member has assigned
            const existsInDb = await modEnrollment.get(resolvedGuild.id + '-' + role[1].id)
            if (existsInDb) {
              valid = [resolvedGuild.id, resolvedGuild.name]
              break
            }
          }
        }
      }
    }
  }
  return valid
}

/**
 * validates whether a user has permission to run this command
 * either they are an owner or part of a moderation role
 * @param user user to check
 * @param guildIdentifier id as returned from autocomplete
 * @param client Discord client
 * @returns [guild ID, guild name] or undefined
 */
export async function validUser (user: User, guildIdentifier: string | null, client: Client) {
  let result = await guildOwnersCheck(user.id, guildIdentifier, client)
  // try against mod members
  if (!result) result = await guildModsCheck(user, guildIdentifier, client)
  return result
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

export async function buildList (interaction: CommandInteraction, namespaces: string[]) {
  // max of 25 fields per embed
  const storage = container.resolve(CubeStorage)
  let elements = 0
  const pages: MessageEmbed[] = []
  let curEmbed = new MessageEmbed({ title: 'Moderation List', color: 'BLUE' })
  // first get all values from a namespace
  for (const ns of namespaces) {
    const items = storage.getNamespace(ns)
    if (items) {
      for (const item of items) {
        if (elements % 24 === 0 && elements !== 0) {
          // new page
          pages.push(curEmbed)
          curEmbed = new MessageEmbed({ title: 'Moderation List', color: 'BLUE' })
        }
        // lists are used for several different purposes
        switch (ns) {
          case 'servers': {
            // determine if user has permission over this server
            const info = await validUser(interaction.user, item.key.replace('servers:', ''), interaction.client)
            if (info) {
              curEmbed = curEmbed.addField(
                'Enrolled Server',
                info[1]
              )
            }
            break
          }
          case 'emoji': {
            // emoji json looks like this
            // {"value":"eee**","expires":null}
            const parsedVal: ValRaw = JSON.parse(item.value)
            const glob = parsedVal.value
            const info = await validUser(
              interaction.user,
              item.key.replace('emoji:', ''), // serverID-globHash
              interaction.client
            )
            if (info) {
              curEmbed = curEmbed.addField(
                'Blocked Glob',
                `Glob: \`${glob}\`\nServer: ${info[1]}`
              )
            }
            break
          }
          case 'channels': {
            const val: ChannelInfo = JSON.parse(item.value).value
            const info = await validUser(
              interaction.user,
              val.guildId,
              interaction.client
            )
            if (info) {
              curEmbed = curEmbed.addField(
                'Blocked Channel',
                `Channel: <#${item.key.replace('channels:', '')}>\nServer: ${info[1]}`
              )
            }
            break
          }
          case 'mods': {
            const info = await validUser(
              interaction.user,
              item.key.replace('mods:', ''),
              interaction.client
            )
            if (info) {
              curEmbed = curEmbed.addField(
                'Moderator Role',
                // remove namespace tag and server ID in key
                `Role: <@${item.key.replace(/(.*?-)/, '')}>\nServer: ${info[1]}`
              )
            }
          }
        }
        elements++
      }
    }
  }
  pages.push(curEmbed)
  return pages
}
