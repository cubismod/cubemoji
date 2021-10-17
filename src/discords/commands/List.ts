import { CommandInteraction } from 'discord.js'
import { Discord, Slash } from 'discordx'
import { sendPaginatedEmbeds } from '@discordx/utilities'
import { grabEmoteCache } from '../../CommandHelper'

@Discord()
export abstract class List {
  @Slash('list', {
    description: 'Get a full list of emojis'
  })
  async list (interaction: CommandInteraction) {
    const emoteCache = grabEmoteCache()
    if (emoteCache !== undefined) {
      // 50 emotes per page
    // ~18 pages
      const emotes: string[] = []
      let curEmotePage = ''
      emoteCache.discEmojis.forEach((emote, i) => {
        if (i !== 0 && !(i % 60)) {
        // append page to emotes obj
        // clear working page
          emotes.push(curEmotePage)
          curEmotePage = ''
        } else if (i === emoteCache.discEmojis.length - 1) {
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
}
