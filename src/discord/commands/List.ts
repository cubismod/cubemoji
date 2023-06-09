import { ApplicationCommandOptionType, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Client, Discord, Slash, SlashChoice, SlashOption } from 'discordx';
import { container } from 'tsyringe';
import { Source } from '../../lib/emote/Cmoji.js';
import { EmoteCache } from '../../lib/emote/EmoteCache.js';
import { sendPagination } from '../../lib/image/DiscordLogic.js';
import { BSGuardData } from '../Guards';

@Discord()
export abstract class List {
  @Slash({
    name: 'list',
    description: 'Get a full list of emojis',
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
    dmPermission: false
  })
  async list(
    @SlashChoice('all')
    @SlashChoice('discord')
    @SlashChoice('mutant_emoji')
    @SlashChoice('this_server')
    @SlashChoice('webpage')
    @SlashOption({
      name: 'subset',
      description: 'Which subset of emotes would you like to choose from?',
      type: ApplicationCommandOptionType.String
    })
      subset: string,
      interaction: CommandInteraction,
      _client: Client,
      data: BSGuardData) {
    const emoteCache = container.resolve(EmoteCache);
    let type = Source.Any;

    switch (subset) {
      case 'discord':
        type = Source.Discord;
        break;
      case 'mutant_emoji':
        type = Source.Mutant;
        break;
      case 'this_server':
        type = Source.ThisServer;
        break;
      case 'webpage':
        await interaction.reply(`Check out an online emoji list at ${process.env.CM_URL}.`);
        return;
    }
    await sendPagination(interaction, type, emoteCache, data.enrolled);
  }
}
