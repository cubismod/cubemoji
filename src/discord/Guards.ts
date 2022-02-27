import { CommandInteraction, ContextMenuInteraction } from 'discord.js'
import { ArgsOf, GuardFunction } from 'discordx'
import { container } from 'tsyringe'
import { CubeStorage } from '../lib/db/Storage'

/**
 * big server guard data
 */
export interface BSGuardData {
  enrolled: boolean
}

/**
 * passes along guard data to tell the main function
 * if this server is part of big server mode
 * does not actually block any commands from executing,
 * applied globally
 */
export const bigServerDetect: GuardFunction<
| ArgsOf<'messageReactionAdd'>
| CommandInteraction
| ContextMenuInteraction > = async (arg, _client, next, data: BSGuardData) => {
  const enrollment = container.resolve(CubeStorage).serverEnrollment
  data.enrolled = false
  if ((arg instanceof CommandInteraction || arg instanceof ContextMenuInteraction)) {
    if (arg.guildId) {
      const status = await enrollment.get(arg.guildId)
      if (status) data.enrolled = true
    }
  } else if (arg[0].message) {
    const guildId = arg[0].message.guildId
    if (guildId) {
      const status = await enrollment.get(guildId)
      if (status) data.enrolled = true
    }
  }
  await next()
}
