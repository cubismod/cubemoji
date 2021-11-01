import { CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashChoice, SlashOption } from 'discordx'
import { Pagination } from '@discordx/utilities'
import { grabEmoteCache } from '../../CommandHelper'

@Discord()
export abstract class List {
  @Slash('list', {
    description: 'Get a full list of emojis'
  })
  async list (
    @SlashChoice('Discord', 'discord')
    @SlashChoice('Mutant', 'mutant')
    @SlashChoice('All', 'all')
    @SlashOption('subset', { description: 'Which subset of emotes would you like to choose from?', required: true })
      subset: string,
      interaction: CommandInteraction) {
    const emoteCache = grabEmoteCache()
    if (emoteCache !== undefined) {
      if (subset === 'discord') {
        // 50 emotes per page
        // ~18 pages
        const emotes: string[] = []
        const menuText: string[] = []
        let menuItem = ''
        let curEmotePage = ''
        emoteCache.discEmojis.forEach((emote, i) => {
          if (i !== 0 && !(i % 60)) {
            // get the last emote that we added to the page
            // and add to menu text
            menuItem = menuItem.concat(emoteCache.discEmojis[i - 1].name)
            // append page to emotes obj
            // clear working page
            emotes.push(curEmotePage)
            menuText.push(menuItem)
            curEmotePage = ''
            menuItem = ''
          } else if (i === emoteCache.discEmojis.length - 1) {
            menuItem = menuItem.concat(emoteCache.discEmojis[i - 1].name)
            // we are done reading this
            emotes.push(curEmotePage)
            menuText.push(menuItem)
          } else if (emote.guildEmoji) {
            if (curEmotePage === '') {
              menuItem = `${emote.name} - `
            }
            // create each emote page
            curEmotePage = curEmotePage.concat(emote.guildEmoji.toString())
          }
        })
        await new Pagination(interaction, emotes, {
          type: 'SELECT_MENU',
          ephemeral: true,
          pageText: menuText
        }).send()
      }
    }
  }
}
