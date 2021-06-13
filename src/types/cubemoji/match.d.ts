// match objects used for cubemoji messaging
// in src/commands/message.js
import Discord = require('discord.js')

interface match {
  match: string,  // id of the matched player
  emote: Discord.GuildEmoji,  // the emoji used to represent that person in chat
  
}