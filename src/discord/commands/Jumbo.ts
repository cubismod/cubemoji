import { RateLimit, TIME_UNIT } from '@discordx/utilities';
import { ApplicationCommandOptionType, AutocompleteInteraction, CommandInteraction, GuildMember } from 'discord.js';
import { Discord, Guard, Slash, SlashOption } from 'discordx';
import { emoteAutocomplete } from '../../lib/cmd/Autocomplete';
import { EditDiscord } from '../../lib/image/DiscordLogic.js';
import strings from '../../res/strings.json' assert {type: 'json'};
import { SourceCommand } from './base/SourceCommand';

@Guard(
  RateLimit(TIME_UNIT.seconds, 60, { ephemeral: true })
)
@Discord()
export abstract class Jumbo extends SourceCommand {
  @Slash({
    name: 'jumbo',
    description: 'blows up the input object',
    defaultMemberPermissions: 'SendMessages',
    dmPermission: false
  })
  async jumbo(
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
      const edDiscord = new EditDiscord(interaction, 'magnify magnify', res, interaction.user);
      await edDiscord.run();
    } else {
      await this.couldNotFind(interaction);
    }
  }
}
