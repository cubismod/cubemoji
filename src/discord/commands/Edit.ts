import {
  ApplicationCommandOptionType,
  Attachment,
  AutocompleteInteraction,
  CommandInteraction,
  GuildMember,
  PermissionFlagsBits
} from 'discord.js';
import { Client, Discord, Slash, SlashOption } from 'discordx';
import { editAutocomplete, emoteAutocomplete } from '../../lib/cmd/Autocomplete';
import { EditDiscord } from '../../lib/image/DiscordLogic.js';
import imgEffects from '../../res/imgEffects.json' assert {type: 'json'};
import strings from '../../res/strings.json' assert {type: 'json'};
import { BSGuardData } from '../Guards';
import { SourceCommand } from './base/SourceCommand';

@Discord()
export abstract class Edit extends SourceCommand {
  @Slash({
    name: 'edit',
    description: 'Edits an emote or image according to the effects you select',
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
    dmPermission: false
  })
  async edit(
    @SlashOption({
      name: 'source',
      description: strings.sourceSlash,
      autocomplete: (interaction: AutocompleteInteraction) => emoteAutocomplete(interaction),
      type: ApplicationCommandOptionType.String,
      required: false
    })
      source: string,
    @SlashOption({
      name: 'member',
      description: 'a server member',
      required: false
    })
      member: GuildMember,
    @SlashOption({
      name: 'attachment',
      description: 'an image to upload',
      required: false,
      type: ApplicationCommandOptionType.Attachment
    })
      attachment: Attachment,
    @SlashOption({
      name: 'effects',
      description: 'list of effects (space separated, max 20). If not specified then random effects will be applied',
      autocomplete: (interaction: AutocompleteInteraction) => editAutocomplete(interaction),
      type: ApplicationCommandOptionType.String,
      required: false
    })
      effects: string,
    @SlashOption({
      name: 'list',
      description: 'get a list of the available effects',
      required: false
    })
      list: boolean,
      interaction: CommandInteraction,
      _client: Client,
      data: BSGuardData
  ) {
    if (list) {
      // just give the user back the effects options
      await interaction.reply({ content: imgEffects.join(' '), ephemeral: true });
    } else {
      const deferOptions = {
        ephemeral: data.enrolled,
        fetchReply: !data.enrolled
      };

      await interaction.deferReply(deferOptions);

      this.source = source;
      this.member = member;
      this.attachment = attachment;
      const url = await this.parseCommand(interaction);

      if (await this.invalidArgsCheck(interaction)) return;

      if (url) {
        const editDiscord = new EditDiscord(interaction, effects, url, interaction.user);
        await editDiscord.run();
      } else {
        await this.couldNotFind(interaction);
      }
    }
  }
}
