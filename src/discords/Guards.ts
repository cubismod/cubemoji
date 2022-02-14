import { CommandInteraction, ContextMenuInteraction } from 'discord.js'
import { ArgsOf, GuardFunction } from 'discordx'
import { container } from 'tsyringe'
import secrets from '../res/secrets.json'
import { CubeStorage } from '../util/Storage'

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
    if (secrets.environment === 'prd' && arg.channelId !== secrets.testChannel) {
      await next()
    }
    // in non-prod state, do the opposite, only interact with events in test channel
    if (secrets.environment === 'npr' && arg.channelId === secrets.testChannel) {
      await next()
    }
  } else {
    if (secrets.environment === 'prd' && arg[0].message.channelId !== secrets.testChannel) {
      await next()
    }
    if (secrets.environment === 'npr' && arg[0].message.channelId === secrets.testChannel) {
      await next()
    }
  }
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
  }
  if (userGuilds) {
    await next()
  }
}
