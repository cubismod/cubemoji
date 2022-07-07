// https://github.com/oceanroleplay/discord.ts-example/blob/main/src/commands/slashes.ts
import { AutocompleteInteraction, ButtonInteraction, CommandInteraction, GuildMember, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { ButtonComponent, Discord, Slash, SlashOption } from 'discordx';
import rgbHex from 'rgb-hex';
import { container } from 'tsyringe';
import { emoteAutocomplete } from '../../lib/cmd/Autocomplete';
import { Source } from '../../lib/emote/Cmoji.js';
import { EmoteCache } from '../../lib/emote/EmoteCache.js';
import { getColors } from '../../lib/image/ColorExtract';
import { CubeLogger } from '../../lib/observability/CubeLogger.js';
import strings from '../../res/strings.json' assert { type: 'json' };

@Discord()
export abstract class Info {
  private emoteCache = container.resolve(EmoteCache);
  private logger = container.resolve(CubeLogger).command;
  private imgUrl = '';

  @Slash('info', {
    description: 'Provides information about an emote or user'
  })
  async info(
    @SlashOption('emote', {
      description: strings.emoteSlash,
      autocomplete: (interaction: AutocompleteInteraction) => emoteAutocomplete(interaction),
      type: 'STRING',
      required: false
    })
      emote: string,
    @SlashOption('member', { description: strings.memberSlash, required: false })
      member: GuildMember,
      interaction: CommandInteraction
  ) {
    if (this.emoteCache !== undefined) {
      // check our args
      if (emote !== undefined && interaction.guildId) {
        // emote parsing code
        const emoteName = emote.toLowerCase();
        const res = await this.emoteCache.retrieve(emoteName, interaction.guildId);
        if (res !== undefined) {
          await interaction.deferReply();

          let embed = new MessageEmbed();
          embed = await this.setColors(embed, res.url);
          embed.setImage(res.url);
          embed.setTitle(res.name);

          // button setup
          this.imgUrl = res.url;
          const row = this.buttonCreate();

          switch (res.source) {
            case Source.Discord: {
              if (res.guildEmoji?.createdAt) embed.addField('Creation Date', `<t:${Math.round(res.guildEmoji.createdAt.getTime() / 1000)}>`);
              if (res.guildEmoji?.id) embed.addField('ID', res.guildEmoji.id);
              embed.addField('URL', res.url);
              if (res.guildEmoji?.animated) embed.addField('Animated', 'Yes');
              if (res.guildEmoji?.guild.name) embed.addField('Origin Server Name', res.guildEmoji.guild.name);
              const author = await res.guildEmoji?.fetchAuthor();
              if (author !== undefined) embed.addField('Author', author.username);
              await interaction.editReply({ embeds: [embed], components: [row] });
              break;
            }
            case Source.Mutant: {
              embed.addField('Disclaimer', ' This bot uses Mutant Standard emoji (https://mutant.tech) which are licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (https://creativecommons.org/licenses/by-nc-sa/4.0/).');
              await interaction.editReply({ embeds: [embed], components: [row] });
              break;
            }
          }
        } else {
          await interaction.reply({ content: strings.noEmoteFound, ephemeral: true });
        }
      } else if (member !== undefined) {
        // user code
        const avatarURL = member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 });
        let embed = new MessageEmbed();

        // button setup
        this.imgUrl = avatarURL;
        const row = this.buttonCreate();

        embed = await this.setColors(embed, avatarURL);
        embed.setTitle(member.user.tag);
        embed.setImage(avatarURL);
        embed.addField('ID', member.user.id);
        embed.addField('Discord Join Date', `<t:${Math.round(member.user.createdAt.getTime() / 1000)}>`);
        if (member.joinedAt) embed.addField('This Server Join Date', `<t:${Math.round(member.joinedAt.getTime() / 1000)}>`);
        embed.addField('Bot', member.user.bot.toString());
        try {
          await interaction.reply({ embeds: [embed], components: [row] });
        } catch (err) {
          this.logger.error(err);
        }
      }
      if ((member === undefined) && (emote === undefined)) {
        await interaction.reply({ content: strings.noArgs, ephemeral: true });
      }
    }
  }

  private async setColors(embed: MessageEmbed, url: string) {
    const colors = await getColors(url);
    const dominant = colors[0];
    if (colors) {
      embed.setColor([dominant[0], dominant[1], dominant[2]]);
    } else embed.setColor('RANDOM');
    return embed;
  }

  private buttonCreate() {
    const button = new MessageButton()
      .setLabel('Generate a palette of dominant colors')
      .setEmoji('🎨')
      .setStyle('PRIMARY')
      .setCustomId('color-button');
    return new MessageActionRow().addComponents(button);
  }

  @ButtonComponent('color-button')
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
    const embeds: MessageEmbed[] = [];
    if (colors && this.imgUrl !== '') {
      colors.forEach((color, i) => {
        if (i < 9) {
          const embed = new MessageEmbed({
            description: `RGB: \`${color}\`\nHex: \`#${rgbHex(color[0], color[1], color[2])}\``,
            color
          });
          embeds.push(embed);
        }
      });
      interaction.editReply({ embeds });
    } else {
      interaction.editReply('colors could not be determined');
    }
  }
}
