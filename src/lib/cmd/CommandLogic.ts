/**
* Various general command patterns involving Discord interactions
* are performed in here
 */
import strings from '../../res/strings.json' assert { type: 'json' };

import { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';
import { autoDeleteMsg, parseForEmote, reply } from '../image/DiscordLogic';

export async function emoteCheck(interaction: CommandInteraction | ContextMenuCommandInteraction, emote: string) {
  await interaction.deferReply();
  let msg: Message | undefined;
  const res = await parseForEmote(interaction, emote);

  if (res) {
    msg = await reply(interaction, res);
  } else {
    msg = await reply(interaction, strings.noEmoteFound);
    autoDeleteMsg(msg);
  }
  return msg;
}
