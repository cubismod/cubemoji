import { CommandInteraction, ContextMenuInteraction } from 'discord.js'
import { ArgsOf, GuardFunction } from 'discordx'
import { container } from 'tsyringe'
import secrets from '../res/secrets.json'
import { CubeStorage } from '../util/Storage'

/**
 * passes along guard data to tell the main function
 * if this server is part of big server mode
 */
export const bigServerDetect: GuardFunction<
| ArgsOf<'messageReactionAdd'>
| CommandInteraction
| ContextMenuInteraction > = async (arg, _client, next, data: {enrolled: boolean}) => {
  const enrollment = container.resolve(CubeStorage).enrollment
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
 * limits npr mode to run in test channel
 * while in prd listens in every guild and channel besides test one defined in secrets
 */
export const TestServer: GuardFunction<
  | ArgsOf<'messageReactionAdd'>
  | CommandInteraction
  | ContextMenuInteraction
> = async (arg, _client, next) => {
  if (arg instanceof CommandInteraction || arg instanceof ContextMenuInteraction) {
    // in production state, only interact with events NOT in the test channel
    // defined in secrets file
    if (secrets.environment === 'prd' && !secrets.testChannels.includes(arg.channelId)) {
      await next()
    }
    // in non-prod state, do the opposite, only interact with events in test channel
    if (secrets.environment === 'npr' && secrets.testChannels.includes(arg.channelId)) {
      await next()
    }
  } else {
    if (secrets.environment === 'prd' && !secrets.testChannels.includes(arg[0].message.channelId)) {
      await next()
    }
    if (secrets.environment === 'npr' && secrets.testChannels.includes(arg[0].message.channelId)) {
      await next()
    }
  }
  console.log('hi')
}

/**
 * validates that user using this command actually
 * owns a guild
 */
export const OwnerCheck: GuardFunction<CommandInteraction> =
async (arg, _client, next) => {
  const storage = container.resolve(CubeStorage)
  const userGuilds = await storage.serverOwners.get(arg.user.id)

  if (arg.user.id === secrets.botOwner) {
    await next()
  } else if (userGuilds) {
    await next()
  }
}
