import { Colors, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import { container } from 'tsyringe';
import { EmoteCache } from '../../lib/emote/EmoteCache.js';
import strings from '../../res/strings.json' assert { type: 'json' };

@Discord()
export abstract class Search {
  @Slash('search', {
    description: 'Search the database for emotes'
  })
  async search(
    @SlashOption('query', { description: 'you can search based on name or Discord ID (snowflake)' })
      query: string,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply({ ephemeral: true }); // ephemeral to avoid spam

    const emoteCache = container.resolve(EmoteCache);
    if (emoteCache !== undefined) {
      const results = emoteCache.search(query);
      if (results.length > 0) {
        // we send results as up to 50 Discord emotes
        // and up to 9 Mutant emotes
        const embeds: EmbedBuilder[] = [];
        // first embed i[0] for discord emojis
        // one embed for each Mutant emote
        const discEmotes: string[] = [];
        // keep a count of both
        let discCount = 0;
        let mutantCount = 0;
        for (const result of results) {
          if (discCount < 51 && mutantCount < 9 && interaction.guildId) {
            if (result.item.guildEmoji !== null && !await emoteCache.isBlocked(result.item.name, interaction.guildId)) {
              discEmotes.push(result.item.guildEmoji.toString());
              ++discCount;
            } else {
              embeds.push(new EmbedBuilder()
                .setTitle(result.item.name)
                .setImage(result.item.url)
                .setColor(Colors.Purple));
              ++mutantCount;
            }
          }
        }

        if (discEmotes.length > 0) {
          // then we create an embed for the discord emotes and put them at the beginning of the embeds array
          const discEmbed = new EmbedBuilder()
            .setTitle(`Search for ${query} (${results.length})`)
            .setDescription(discEmotes.join('').slice(0, 2047)) // avoid api error of going over char count
            .setColor(Colors.Blue)
            .addFields([
              {
                name: 'Mutant Emojis',
                value: 'Below there may be emotes from the [Mutant emote pack](https://mutant.tech/) that you can use with Cubemoji as well with their names!'
              }
            ]);
          embeds.unshift(discEmbed);
        }

        await interaction.editReply({ embeds });
      } else {
        await interaction.editReply(strings.noEmoteFound);
      }
    }
  }
}
