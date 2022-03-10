import { CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { container } from 'tsyringe'
import { EmoteCache } from '../../lib/emote/EmoteCache.js'

@Discord()
export abstract class Random {
  @Slash('random', {
    description: 'insert a random emote'
  })
  async random (
    @SlashOption('items', { description: 'how many emotes would you like in the chat, max 25', required: false })
      items: number,
      interaction: CommandInteraction
  ) {
    const emoteCache = container.resolve(EmoteCache)
    await interaction.deferReply()
    if (interaction.guildId) {
      // we will need to use a different sampling method like this
      const emotes = [...await emoteCache.randomChoice(items, interaction.guildId, true)].splice(0, 26)
      // here we are iterating through the emotes to get textual representations in a string[]
      // and then we join that list to send back to the user
      await interaction.editReply(
        emotes.map(emote => {
          if (emote.guildEmoji) return emote.guildEmoji.toString()
          else return ''
        }).join('')
      )
    }
  }
}
