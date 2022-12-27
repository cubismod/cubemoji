import {
  ApplicationCommandOptionType,
  Attachment,
  AutocompleteInteraction,
  CommandInteraction,
  GuildMember,
  PermissionFlagsBits
} from 'discord.js';
import { Client, Discord, Slash, SlashChoice, SlashOption } from 'discordx';
import { emoteAutocomplete } from '../../lib/cmd/Autocomplete.js';
import { FaceDiscord } from '../../lib/image/DiscordLogic.js';
import strings from '../../res/strings.json' assert { type: 'json' };
import { BSGuardData } from '../Guards.js';
import { SourceCommand } from './base/SourceCommand.js';

@Discord()
export abstract class AddFace extends SourceCommand {
  @Slash({
    name: 'addface',
    description: 'Adds a face or...other to an emote or image',
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
    dmPermission: false
  })
  async addface(
      @SlashChoice('joy')
      @SlashChoice('pensive')
      @SlashChoice('plead')
      @SlashChoice('thinking')
      @SlashChoice('triumph')
      @SlashChoice('weary')
      @SlashChoice('zany')
      @SlashChoice('flushed')
      @SlashOption({
        name: 'face',
        description: 'face to composite on an image',
        type: ApplicationCommandOptionType.String
      })
        face: string,
    @SlashOption({
      name: 'source',
      description: strings.sourceSlash,
      autocomplete: (interaction: AutocompleteInteraction) => emoteAutocomplete(interaction),
      required: false,
      type: ApplicationCommandOptionType.String
    })
        source: string,
    @SlashOption({
      name: 'member',
      description: 'a server member',
      required: false,
      type: ApplicationCommandOptionType.User
    })
        member: GuildMember,
    @SlashOption({
      name: 'attachment',
      description: 'an image to upload',
      required: false,
      type: ApplicationCommandOptionType.Attachment
    })
        attachment: Attachment,

        interaction: CommandInteraction,
        _client: Client,
        data: BSGuardData
  ) {
    await interaction.deferReply({ ephemeral: data.enrolled, fetchReply: !data.enrolled });

    this.source = source;
    this.member = member;
    this.attachment = attachment;

    if (await this.invalidArgsCheck(interaction)) return;

    const url = await this.parseCommand(interaction);

    if (url) {
      const addFace = new FaceDiscord(interaction, face, url, interaction.user);
      await addFace.run();
    } else {
      await this.couldNotFind(interaction);
    }
  }
}
