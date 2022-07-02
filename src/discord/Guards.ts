import { ButtonInteraction, CommandInteraction, ContextMenuInteraction } from 'discord.js';
import { ArgsOf, GuardFunction } from 'discordx';
import { container } from 'tsyringe';
import { CubeStorage } from '../lib/db/Storage.js';

/**
 * big server guard data
 */
export interface BSGuardData {
  enrolled: boolean;
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
  | ContextMenuInteraction> = async (arg, _client, next, data: BSGuardData) => {
    const enrollment = container.resolve(CubeStorage).serverEnrollment;
    data.enrolled = false;
    if (arg instanceof CommandInteraction || arg instanceof ContextMenuInteraction) {
      if (arg.guildId) {
        const status = await enrollment.get(arg.guildId);
        if (status) data.enrolled = true;
      }
    } else if (arg[0] &&
      arg[0].hasOwnProperty('message') &&
      arg[0].message) {
      // reactions
      const guildId = arg[0].message.guildId;
      if (guildId) {
        const status = await enrollment.get(guildId);
        if (status) data.enrolled = true;
      }
    }
    await next();
  };

export const botOwnerDetect: GuardFunction<CommandInteraction> = async(
  arg, _client, next
) => {
  if (arg.user.id === process.env.CM_BOTOWNER) await next();
};

/**
 * ignores commands in blocked channels except for moderation commands
 * so that a user does not lock themselves out from the bot
 */
export const blockedChannelDetect: GuardFunction<
  | ArgsOf<'messageReactionAdd'>
  | CommandInteraction
  | ButtonInteraction
  | ContextMenuInteraction> = async (arg, _client, next) => {
    const blockedChannels = container.resolve(CubeStorage).blockedChannels;
    if (arg instanceof CommandInteraction) {
      // for Slash commands, we allow moderation commands no matter what
      // but block any other commands that occur in a blocked channel
      // if the database check returns undefined, it means that the channel is not blocked
      if (arg.commandName.includes('mod')) await next();
      else if (!await blockedChannels.get(arg.channelId)) await next();
    } else if (arg instanceof ContextMenuInteraction) {
      if (!await blockedChannels.get(arg.channelId)) await next();
    } else if (arg[0] && arg[0] instanceof ButtonInteraction) {
      if (!await blockedChannels.get(arg[0].channelId)) await next();
    } else if (arg instanceof ButtonInteraction) {
      if (!await blockedChannels.get(arg.channelId)) await next();
    } else if (arg[0] &&
      arg[0].hasOwnProperty('message') &&
      arg[0].message &&
      !await blockedChannels.get(arg[0].message.channelId)) await next();
    // reaction commands ^
    else await next();
  };
