import { CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { choice, geometricReservoirSample } from 'pandemonium'
import { grabEmoteCache } from '../../util/CommandHelper'
import { Cmoji } from '../../util/Cubemoji'

@Discord()
export abstract class Random {
  @Slash('random', {
    description: 'insert a random emote'
  })
  async random (
    @SlashOption('copies', { description: 'how many emotes would you like in the chat, max 25' })
      copies: number,
    @SlashOption('flushed', { description: 'whether you want only flushed emotes' })
      flushed: boolean,
      interaction: CommandInteraction
  ) {
    const emoteCache = grabEmoteCache()
    if (emoteCache !== undefined) {
      await interaction.deferReply()
      // depending on the user option, we will either grab all discord emojis to sample from or
      // just flushed emojis
      let emoteOptions: Cmoji[]
      if (flushed) emoteOptions = emoteCache.searchDiscord('flushed').map(fuseResult => fuseResult.item)
      else emoteOptions = emoteCache.discEmojis

      if (copies < 26) {
        // we will need to use a different sampling method like this
        const emotes = geometricReservoirSample(copies, emoteOptions)
        // here we are iterating through the emotes to get textual representations in a string[]
        // and then we join that list to send back to the user
        await interaction.editReply(
          emotes.map(emote => {
            if (emote.guildEmoji) return emote.guildEmoji.toString()
            else return ''
          }).join('')
        )
      } else {
        const chosenEmote = choice(emoteOptions)
        if (chosenEmote.guildEmoji) await interaction.editReply(chosenEmote.guildEmoji.toString())
        else await interaction.deleteReply()
      }
    }
  }
}
