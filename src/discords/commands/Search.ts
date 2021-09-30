import { CommandInteraction, MessageEmbed } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { Companion } from '../../Cubemoji'
import strings from '../../res/strings.json'

@Discord()
export abstract class Search {
  @Slash('search', {
    description: 'Search the database for emotes'
  })
  async search (
    @SlashOption('query', { description: 'you can search based on name or Discord ID (snowflake)', required: true })
      query: string,
      interaction: CommandInteraction
  ) {
    try {
      await interaction.deferReply({ ephemeral: true }) // ephemeral to avoid spam
    } catch (err) {
      console.error(err)
    }
    const companion : Companion = globalThis.companion
    const results = companion.cache.search(query)
    if (results.length > 0) {
      // we send results as up to 50 Discord emotes
      // and up to 9 Mutant emotes
      const embeds: MessageEmbed[] = []
      // first embed i[0] for discord emojis
      // one embed for each Mutant emote
      const discEmotes: string[] = []
      // keep a count of both
      let discCount = 0
      let mutantCount = 0
      results.forEach(result => {
        if (discCount < 51 && mutantCount < 9) {
          if (result.item.guildEmoji !== null) {
            discEmotes.push(result.item.guildEmoji.toString())
            ++discCount
          } else {
            embeds.push(new MessageEmbed()
              .setTitle(result.item.name)
              .setImage(result.item.url)
              .setColor('PURPLE'))
            ++mutantCount
          }
        }
      })
      // then we create an embed for the discord emotes and put them at the beginning of the embeds array
      const discEmbed = new MessageEmbed()
        .setTitle(`Search for ${query} (${results.length})`)
        .setDescription(discEmotes.join('').slice(0, 2047)) // avoid api error of going over char count
        .setColor('BLUE')
        .setFooter('Searching yielding tons of results will be truncated. Use `/list` to get a list of all emotes. Below are emotes from the Mutant emote pack (https://mutant.tech/) that you can use with Cubemoji!')
      embeds.unshift(discEmbed)
      try {
        await interaction.editReply({ embeds: embeds })
      } catch (error) {
        console.error(error)
      }
    } else {
      try {
        await interaction.editReply(strings.noEmoteFound)
      } catch (error) {
        console.error(error)
      }
    }
  }
}
