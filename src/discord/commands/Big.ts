import { RateLimit, TIME_UNIT } from '@discordx/utilities';
import {
  ApplicationCommandOptionType,
  AutocompleteInteraction,
  CommandInteraction,
  GuildMember,
  PermissionFlagsBits
} from 'discord.js';
import { Discord, Guard, Slash, SlashOption } from 'discordx';
import { emoteAutocomplete } from '../../lib/cmd/Autocomplete';
import { reply } from '../../lib/image/DiscordLogic.js';
import strings from '../../res/strings.json' assert {type: 'json'};
import { SourceCommand } from './base/SourceCommand';

@Discord()
@Guard(
  RateLimit(TIME_UNIT.seconds, 10, {
    ephemeral: true,
    rateValue: 3
  })
)
export abstract class Big extends SourceCommand {
    @Slash({
      name: 'big',
      description: 'enlarges the input object',
      defaultMemberPermissions: PermissionFlagsBits.SendMessages,
      dmPermission: false
    })
  async big(
        @SlashOption({
          name: 'emote',
          description: strings.emoteSlash,
          autocomplete: (interaction: AutocompleteInteraction) => emoteAutocomplete(interaction),
          type: ApplicationCommandOptionType.String,
          required: false
        })
          emote: string,
        @SlashOption({
          name: 'member',
          description: strings.memberSlash,
          required: false
        })
          member: GuildMember,
          interaction: CommandInteraction
  ) {
    await interaction.deferReply();

    this.source = emote;
    this.member = member;

    if (await this.invalidArgsCheck(interaction)) return;

    const res = await this.parseCommand(interaction);

    if (res) {
      const msg = await reply(interaction, res);
      await this.registerTrash(interaction, msg);
    } else {
      await this.couldNotFind(interaction);
    }
  }
}
