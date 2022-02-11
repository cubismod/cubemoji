import { CommandInteraction, ContextMenuInteraction } from 'discord.js'
import { ArgsOf, GuardFunction } from 'discordx'
import secrets from '../secrets.json'

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
