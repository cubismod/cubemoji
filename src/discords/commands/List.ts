import { CommandInteraction } from 'discord.js'
import { Discord, Slash } from 'discordx'
import { Companion } from '../../Cubemoji'
import { sendPaginatedEmbeds } from '@discordx/utilities'

@Discord()
export abstract class List {
  @Slash('list', {
    description: 'Get a full list of emojis'
  })
  async list (interaction: CommandInteraction) {
    const companion : Companion = globalThis.companion

    // 50 emotes per page
    // ~18 pages
    const emotes: string[] = []
    let curEmotePage = ''
    companion.cache.discEmojis.forEach((emote, i) => {
      if (i !== 0 && !(i % 50)) {
        // append page to emotes obj
        // clear working page
        emotes.push(curEmotePage)
        curEmotePage = ''
      } else if (i === companion.cache.discEmojis.length - 1) {
        // we are done reading this
        emotes.push(curEmotePage)
      } else {
        curEmotePage = curEmotePage.concat(emote.toString())
      }
    })
    await sendPaginatedEmbeds(interaction, emotes, {
      type: 'SELECT_MENU'
    })
  }
}
