import { CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { choice, geometricReservoirSample } from 'pandemonium'
import { Companion } from '../../Cubemoji'

@Discord()
export abstract class Flushed {
  @Slash('flushed', {
    description: 'insert a random flushed emote'
  })
  async flushed (
    @SlashOption('copies', { description: 'how  many flushed emotes would you like in the chat, max 25' })
      copies: number,
      interaction: CommandInteraction
  ) {
    const companion : Companion = globalThis.companion
    try {
      await interaction.deferReply()
    } catch (error) {
      console.error(error)
    }
    if (copies < 26) {
      // we will need to use a different sampling method like this
      const emotes = geometricReservoirSample(copies, companion.cache.searchDiscord('flushed'))
      try {
        // here we are iterating through the emotes to get textual representations in a string[]
        // and then we join that list to send back to the user
        await interaction.editReply(
          emotes.map(emote => emote.item.toString()).join('')
        )
      } catch (error) {
        console.error(error)
      }
    } else {
      try {
        await interaction.editReply(choice(companion.cache.searchDiscord('flushed')).item.toString())
      } catch (error) {
        console.error(error)
      }
    }
  }
}
