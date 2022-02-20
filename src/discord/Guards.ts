import { CommandInteraction, ContextMenuInteraction } from 'discord.js'
import { ArgsOf, GuardFunction } from 'discordx'
import { container } from 'tsyringe'
import { CubeStorage } from '../lib/db/Storage'

/**
 * passes along guard data to tell the main function
 * if this server is part of big server mode
 */
export const bigServerDetect: GuardFunction<
| ArgsOf<'messageReactionAdd'>
| CommandInteraction
| ContextMenuInteraction > = async (arg, _client, next, data: {enrolled: boolean}) => {
  const enrollment = container.resolve(CubeStorage).serverEnrollment
  if ((arg instanceof CommandInteraction || arg instanceof ContextMenuInteraction)) {
    if (arg.guildId) {
      const status = await enrollment.get(arg.guildId)
      if (status) data.enrolled = true
      else data.enrolled = false
    }
    await next()
  } else {
    const guildId = arg[0].message.guildId
    if (guildId) {
      const status = await enrollment.get(guildId)
      if (status) data.enrolled = true
      else data.enrolled = false
    }
    await next()
  }
}

/**
 * validates that user using this command actually
 * owns a guild
 */
/* export const OwnerCheck: GuardFunction<CommandInteraction> =
async (arg, _client, next) => {
  const storage = container.resolve(CubeStorage)
  const userGuilds = await storage.serverOwners.get(arg.user.id)

  if (arg.user.id === process.env.CM_BOTOWNER) {
    await next()
  } else if (userGuilds) {
    await next()
  }
} */
