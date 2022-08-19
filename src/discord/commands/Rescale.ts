import { ApplicationCommandOptionType, AutocompleteInteraction, Client, CommandInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import { emoteAutocomplete } from '../../lib/cmd/Autocomplete';
import { RescaleDiscord } from '../../lib/image/DiscordLogic.js';
import strings from '../../res/strings.json' assert { type: 'json' };
import { BSGuardData } from '../Guards';

@Discord()
export abstract class Rescale {
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
    @SlashOption({ name: 'member', description: 'a user', required: false })
      user: GuildMember,
      interaction: CommandInteraction,
      _client: Client,
      data: BSGuardData
  ) {
    const deferOptions = {
      ephemeral: data.enrolled,
      fetchReply: !data.enrolled
    };
    if (!emote && !user) {
      interaction.reply({ content: strings.noArgs, ephemeral: true });
    } else if (emote) {
      await interaction.deferReply(deferOptions);
      const rsDiscord = new RescaleDiscord(interaction, emote, interaction.user);
      await rsDiscord.run();
    } else if (user) {
      await interaction.deferReply(deferOptions);
      const rsDiscord = new RescaleDiscord(interaction, user.displayAvatarURL({ size: 256, extension: 'png' }), interaction.user);
      await rsDiscord.run();
    }
  }
}
