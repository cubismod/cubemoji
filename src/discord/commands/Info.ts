// https://github.com/oceanroleplay/discord.ts-example/blob/main/src/commands/slashes.ts
import {
  ApplicationCommandOptionType,
  AutocompleteInteraction, CommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits
} from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import { container } from 'tsyringe';
import { emoteAutocomplete } from '../../lib/cmd/Autocomplete.js';
import { Source } from '../../lib/emote/Cmoji.js';
import { EmoteCache } from '../../lib/emote/EmoteCache.js';
import { CubeLogger } from '../../lib/observability/CubeLogger.js';
import strings from '../../res/strings.json' assert { type: 'json' };

@Discord()
export abstract class Info {
  private emoteCache = container.resolve(EmoteCache);
  private logger = container.resolve(CubeLogger).command;
  private imgUrl = '';

  @Slash({
    name: 'info',
    description: 'Provides information about an emote or user',
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
    dmPermission: false
  })
  async info(
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
      required: false,
      type: ApplicationCommandOptionType.User
    })
      member: GuildMember,
      interaction: CommandInteraction
  ) {
    // check our args
    if (emote !== undefined && interaction.guildId) {
      // emote parsing code
      const emoteName = emote.toLowerCase();
      const res = await this.emoteCache.retrieve(emoteName, interaction.guildId);
      if (res !== undefined) {
        await interaction.deferReply();

        const embed = new EmbedBuilder();
        // embed = await this.setColors(embed, res.url);
        embed.setImage(res.url);
        embed.setTitle(res.name);

        // button setup
        this.imgUrl = res.url;
        // const row = this.buttonCreate();

        switch (res.source) {
          case Source.Discord: {
            if (res.guildEmoji?.createdAt) {
              embed.addFields([
                {
                  name: 'Creation Date',
                  value: `<t:${Math.round(res.guildEmoji.createdAt.getTime() / 1000)}>`
                }
              ]);
            }
            if (res.guildEmoji?.id) {
              embed.addFields([
                { name: 'ID', value: res.guildEmoji.id }
              ]);
            }
            embed.addFields([
              { name: 'URL', value: res.url }
            ]);
            if (res.guildEmoji?.animated) {
              embed.addFields([
                { name: 'Animated', value: 'Yes' }
              ]);
            }
            if (res.guildEmoji?.guild.name) {
              embed.addFields([
                {
                  name: 'Origin Server Name', value: res.guildEmoji.guild.name
                }
              ]);
            }
            const author = await res.guildEmoji?.fetchAuthor();
            if (author !== undefined) {
              embed.addFields([
                { name: 'Author', value: author.username }
              ]);
            }
            await interaction.editReply({ embeds: [embed] });
            break;
          }
          case Source.Mutant: {
            embed.addFields([
              {
                name: 'Disclaimer',
                value: 'This bot uses Mutant Standard emoji (https://mutant.tech) which are licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (https://creativecommons.org/licenses/by-nc-sa/4.0/).'
              }
            ]);
            await interaction.editReply({ embeds: [embed] });
            break;
          }
        }
      } else {
        await interaction.reply({ content: strings.noEmoteFound, ephemeral: true });
      }
    } else if (member !== undefined) {
      // user code
      const avatarURL = member.displayAvatarURL({ size: 256, extension: 'png' });
      const embed = new EmbedBuilder();

      // button setup
      this.imgUrl = avatarURL;

      embed.setTitle(member.user.tag);
      embed.setImage(avatarURL);
      embed.addFields([
        { name: 'ID', value: member.user.id }
      ]);
      embed.addFields([
        { name: 'Discord Join Date', value: `<t:${Math.round(member.user.createdAt.getTime() / 1000)}>` }
      ]);
      if (member.joinedAt) {
        embed.addFields([
          { name: 'This Server Join Date', value: `<t:${Math.round(member.joinedAt.getTime() / 1000)}>` }
        ]);
      };

      embed.addFields([
        { name: 'Bot', value: member.user.bot.toString() }
      ]);
      await interaction.reply({ embeds: [embed] });
    }
    if ((member === undefined) && (emote === undefined)) {
      await interaction.reply({ content: strings.noArgs, ephemeral: true });
    }
  }
}

/*   private async setColors(embed: EmbedBuilder, url: string) {
    const colors = await getColors(url);
    if (colors) {
      const dominant = colors[0];
      embed.setColor([dominant[0], dominant[1], dominant[2]]);
    } else embed.setColor(Colors.Navy);
    return embed;
  }

  private buttonCreate() {
    const button = new ButtonBuilder()
      .setLabel('Generate a palette of dominant colors')
      .setEmoji('🎨')
      .setStyle(ButtonStyle.Primary)
      .setCustomId('color-button');
    return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
  }

  @ButtonComponent({ id: 'color-button' })
  async colorButton(interaction: ButtonInteraction) {
    await interaction.deferReply({ ephemeral: true });
    // snag url if this is a cached reply
    // since we won't have the imgUrl saved
    if (this.imgUrl === '') {
      const msg = interaction.message;
      if (msg.embeds[0] && msg.embeds[0].image) {
        this.imgUrl = msg.embeds[0].image.url;
      }
    }
    const colors = await getColors(this.imgUrl);
    const embeds: EmbedBuilder[] = [];
    if (colors && this.imgUrl !== '') {
      colors.forEach((color, i) => {
        if (i < 9) {
          const embed = new EmbedBuilder({
            description: `RGB: \`${color}\`\nHex: \`#${rgbHex(color[0], color[1], color[2])}\``,
            color: colorToInt(color)
          });
          embeds.push(embed);
        }
      });
      await interaction.editReply({ embeds });
    } else {
      await interaction.editReply('colors could not be determined');
    }
  }
} */
