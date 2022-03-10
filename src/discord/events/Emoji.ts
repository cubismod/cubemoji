// logging for emoji add/remove events
// as well as updating our own emote cache

import { GuildEmoji } from 'discord.js'
import { Discord, On } from 'discordx'
import { container } from 'tsyringe'
import { EmoteCache } from '../../lib/emote/EmoteCache.js'

@Discord()
export abstract class EmojiEvents {
  @On('emojiCreate')
  async emojiCreate (emojis: GuildEmoji[]) {
    if (emojis.length > 0) {
      const emoteCache = container.resolve(EmoteCache)
      if (emoteCache) emoteCache.addEmote(emojis[0])
    }
  }

  @On('emojiDelete')
  async emojiDelete (emojis: GuildEmoji[]) {
    if (emojis.length > 0) {
      const emoteCache = container.resolve(EmoteCache)
      if (emoteCache) emoteCache.removeEmote(emojis[0])
    }
  }

  @On('emojiUpdate')
  async emojiUpdate (emojis: GuildEmoji[]) {
    if (emojis.length > 1) {
      // the event returns an array with the old emoji at pos 0, new emoji at pos 1
      const emoteCache = container.resolve(EmoteCache)
      if (emoteCache) emoteCache.editEmote(emojis[0], emojis[1])
    }
  }
}
