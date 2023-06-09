import { RateLimit, TIME_UNIT } from '@discordx/utilities';
import { ApplicationCommandOptionType, AutocompleteInteraction, CommandInteraction, Message, PermissionFlagsBits } from 'discord.js';
import { Discord, Guard, Slash, SlashOption } from 'discordx';
import { container } from 'tsyringe';
import { emoteAutocomplete } from '../../lib/cmd/Autocomplete.js';
import { CubeMessageManager } from '../../lib/cmd/MessageManager.js';
import { Source } from '../../lib/emote/Cmoji.js';
import { EmoteCache } from '../../lib/emote/EmoteCache.js';
import { autoDeleteMsg, reply } from '../../lib/image/DiscordLogic.js';
import strings from '../../res/strings.json' assert { type: 'json' };

@Discord()
@Guard(
  RateLimit(TIME_UNIT.seconds, 10, {
    ephemeral: true,
    rateValue: 3
  })
)
export abstract class Emote {
  @Slash({
    name: 'emote',
    description: 'inserts an emote into chat',
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
    dmPermission: false
  })
  async emote (
    @SlashOption({
      name: 'emote',
      description: strings.emoteSlash,
      autocomplete: (interaction: AutocompleteInteraction) => emoteAutocomplete(interaction),
      type: ApplicationCommandOptionType.String
    })
      emote: string,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply();
    let rep: Message|undefined;
    const emoteCache = container.resolve(EmoteCache);
    if (interaction.guildId) {
      const retrievedEmoji = await emoteCache.retrieve(emote, interaction.guildId);
      if (retrievedEmoji !== undefined) {
        let msg = '';
        // now send a different obj depending on what type of emote we are sending
        switch (retrievedEmoji.source) {
          case Source.Discord: {
            if (retrievedEmoji.guildEmoji != null) msg = retrievedEmoji.guildEmoji.toString();
            break;
          }
          case Source.Mutant:
          case Source.URL:
            msg = retrievedEmoji.url;
        }
        rep = await reply(interaction, msg);
      } else {
        rep = await reply(interaction, strings.noEmoteFound);
        autoDeleteMsg(rep);
      }
      const cubeMessageManager = container.resolve(CubeMessageManager);
      if (rep) cubeMessageManager.registerTrashReact(interaction, rep, interaction.user.id);
    }
  }
}
