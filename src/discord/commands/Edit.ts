import { ApplicationCommandOptionType, AutocompleteInteraction, CommandInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';
import { Client, Discord, Slash, SlashOption } from 'discordx';
import { editAutocomplete, emoteAutocomplete } from '../../lib/cmd/Autocomplete';
import { EditDiscord } from '../../lib/image/DiscordLogic.js';
import imgEffects from '../../res/imgEffects.json' assert { type: 'json' };
import strings from '../../res/strings.json' assert { type: 'json' };
import { BSGuardData } from '../Guards';

@Discord()
export abstract class Edit {
  @Slash('edit', {
    description: 'Edits an emote or image according to the effects you select',
    defaultMemberPermissions: PermissionFlagsBits.SendMessages
  })
  async edit(
    @SlashOption('source', {
      description: strings.sourceSlash,
      autocomplete: (interaction: AutocompleteInteraction) => emoteAutocomplete(interaction),
      type: ApplicationCommandOptionType.String,
      required: false
    })
      emote: string,
    @SlashOption('member', { description: 'a server member', required: false })
      member: GuildMember,
    @SlashOption('effects', {
      description: 'list of effects (space separated, max 20). If not specified then random effects will be applied',
      autocomplete: (interaction: AutocompleteInteraction) => editAutocomplete(interaction),
      type: ApplicationCommandOptionType.String,
      required: false
    })
      effects: string,
    @SlashOption('list', { description: 'get a list of the available effects', required: false })
      list: boolean,
      interaction: CommandInteraction,
      _client: Client,
      data: BSGuardData
  ) {
    if (list) {
      // just give the user back the effects options
      interaction.reply({ content: imgEffects.join(' '), ephemeral: true });
    } else {
      const deferOptions = {
        ephemeral: data.enrolled,
        fetchReply: !data.enrolled
      };
      if (!emote && !member) {
        interaction.reply({ content: strings.noArgs, ephemeral: true });
      } else if (emote) {
        await interaction.deferReply(deferOptions);
        const edDiscord = new EditDiscord(interaction, effects, emote, interaction.user);
        await edDiscord.run();
      } else if (member) {
        await interaction.deferReply(deferOptions);
        const edDiscord = new EditDiscord(interaction, effects, member.displayAvatarURL({ extension: 'png', size: 256 }), interaction.user);
        await edDiscord.run();
      }
    }
  }
}
