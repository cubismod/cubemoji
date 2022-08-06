import { RateLimit, TIME_UNIT } from '@discordx/utilities';
import { ApplicationCommandOptionType, AutocompleteInteraction, CommandInteraction, GuildMember } from 'discord.js';
import { Discord, Guard, Slash, SlashOption } from 'discordx';
import { emoteAutocomplete } from '../../lib/cmd/Autocomplete';
import { EditDiscord, parseForEmote } from '../../lib/image/DiscordLogic.js';
import strings from '../../res/strings.json' assert { type: 'json' };

@Guard(
  RateLimit(TIME_UNIT.seconds, 60, { ephemeral: true })
)
@Discord()
export abstract class Jumbo {
  @Slash('jumbo', {
    description: 'blows up the input object',
    defaultMemberPermissions: 'SendMessages'
  })
  async jumbo(
    @SlashOption('emote', {
      description: strings.emoteSlash,
      autocomplete: (interaction: AutocompleteInteraction) => emoteAutocomplete(interaction),
      type: ApplicationCommandOptionType.String,
      required: false
    })
      emote: string,
    @SlashOption('member', { description: strings.memberSlash, required: false })
      member: GuildMember,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply();
    if (emote !== undefined) {
      const res = await parseForEmote(interaction, emote);
      if (res) {
        const edDiscord = new EditDiscord(interaction, 'magnify magnify', res, interaction.user);
        await edDiscord.run();
      } else {
        await interaction.editReply(strings.noEmoteFound);
      }
    } else if (member !== undefined) {
      // user code
      // no need to defer a reply since we don't have to search through the emote cache
      const edDiscord = new EditDiscord(interaction, 'magnify magnify', member.displayAvatarURL({ size: 256, extension: 'png' }), interaction.user);
      await edDiscord.run();
    }
    if ((member === undefined) && (emote === undefined)) {
      await interaction.editReply({ content: strings.noArgs });
    }
  }
}
