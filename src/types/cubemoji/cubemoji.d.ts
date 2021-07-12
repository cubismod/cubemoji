/* eslint-disable no-unused-vars */
import { EmoteCache } from '../../emote-cache'
import workerpool = require('workerpool')
import fbadmin = require('firebase-admin')
import Discord = require('discord.js')

// custom cubemoji types
declare namespace Cubemoji {
 // cubemoji anon messaging match objects
 interface Match {
  match: string; // id of the matched player
  emote: Discord.GuildEmoji; // the emoji used to represent that person in chat
  timeLeft: number; // time stored in ms of course
  timeout: NodeJS.Timeout // an actual timeout obj
  id: boolean; // indicates the user wants to reveal their owen id
}
  // util serves as a catch-all reference object that
  // commands can use to spin up workers, access the emote cache
  // and update the firebase database
  interface Util {
    cache: EmoteCache; // custom emote cache taking Discord's and charging it up
    pool: workerpool.WorkerPool; // workers used for jimp actions
    cmSettings: fbadmin.database.Reference; // global settings that need to be preserved through restarts
    slotsDb: fbadmin.database.Reference; // slots db in firebase
    slotsUsers: Set<Discord.Snowflake>; // set of user IDs who are currently on the leaderboard
    topPlayer: string; // since this value is pulled from firebase, it's in string format rather than snowflake
    topPlayerTime: string;
    beginTop: string;
    matches: Match;
    openUsers: Map<Discord.Snowflake, Discord.Snowflake>;
    rescaleMsgs: Map<Discord.Snowflake, Discord.Snowflake>;
    queuedForReset: boolean;
    nextLbReset: number;
    commands: Discord.Collection<string, Cubemoji.Command>; // cubemoji command name and then a reference to the command class
  }

  // simpler emoji representation
  interface Emoji {
    url: string,
    external: boolean
  }
  // a command triggered by the user
  interface Command {
    name: string;
    description: string;
    usage: string;
    aliases: string[];
  }
}
