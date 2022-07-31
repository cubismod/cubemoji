import { RateLimit, TIME_UNIT } from '@discordx/utilities';
import { ApplicationCommandOptionType, AutocompleteInteraction, CommandInteraction, GuildMember, Message } from 'discord.js';
import { Discord, Guard, Slash, SlashOption } from 'discordx';
import { container } from 'tsyringe';
import { emoteAutocomplete } from '../../lib/cmd/Autocomplete';
import { emoteCheck } from '../../lib/cmd/CommandLogic';
import { CubeMessageManager } from '../../lib/cmd/MessageManager.js';
import { autoDeleteMsg, reply } from '../../lib/image/DiscordLogic.js';
import strings from '../../res/strings.json' assert { type: 'json' };

@Discord()
@Guard(
  RateLimit(TIME_UNIT.seconds, 10, {
    ephemeral: true,
    rateValue: 3
  })
)
export abstract class Big {
  @Slash('big', {
    description: 'enlarges the input object'
  })
  async big(
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
    let msg: Message | undefined;
    if (emote !== undefined) {
      msg = await emoteCheck(interaction, emote);
    } else if (member !== undefined) {
      // user code
      // no need to defer a reply since we don't have to search through the emote cache
      msg = await reply(interaction, member.user.displayAvatarURL({ size: 256, extension: 'png' }));
    }
    if ((member === undefined) && (emote === undefined)) {
      msg = await reply(interaction, strings.noArgs);
      autoDeleteMsg(msg);
    }
    const cubeMessageManager = container.resolve(CubeMessageManager);
    if (msg) cubeMessageManager.registerTrashReact(interaction, msg, interaction.user.id);
  }
}
