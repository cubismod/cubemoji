import {
  ApplicationCommandOptionType,
  AutocompleteInteraction,
  Client,
  CommandInteraction,
  GuildMember,
  PermissionFlagsBits
} from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import { emoteAutocomplete } from '../../lib/cmd/Autocomplete.js';
import { RescaleDiscord } from '../../lib/image/DiscordLogic.js';
import strings from '../../res/strings.json' assert { type: 'json' };
import { BSGuardData } from '../Guards.js';
import { SourceCommand } from './base/SourceCommand.js';

@Discord()
export abstract class Rescale extends SourceCommand {
  @Slash({
    name: 'rescale',
    description: 'Rescale an image or emote using Seam carving to humorous results',
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
    dmPermission: false
  })
  async rescale(
    @SlashOption({
      name: 'source',
      description: strings.sourceSlash,
      autocomplete: (interaction: AutocompleteInteraction) => emoteAutocomplete(interaction),
      type: ApplicationCommandOptionType.String,
      required: false
    })
      emote: string,
    @SlashOption({
      name: 'member',
      description: 'a user',
      required: false,
      type: ApplicationCommandOptionType.User
    })
      user: GuildMember,
      interaction: CommandInteraction,
      _client: Client,
      data: BSGuardData
  ) {
    const deferOptions = {
      ephemeral: data.enrolled,
      fetchReply: !data.enrolled
    };

    this.source = emote;
    this.member = user;

    await interaction.deferReply(deferOptions);

    const res = await this.parseCommand(interaction);

    if (res) {
      const rsDiscord = new RescaleDiscord(interaction, res, interaction.user);
      await rsDiscord.run();
    } else {
      await this.couldNotFind(interaction);
    }
  }
}
