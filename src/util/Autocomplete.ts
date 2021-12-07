import { AutocompleteInteraction } from 'discord.js'
import { geometricReservoirSample } from 'pandemonium'
import { grabEmoteCache } from './CommandHelper'
// useful autocomplete commands for discord functions

/**
 * emote autocomplete resolver, follows the user's
 * query and presents them with emotes that match
 * whatever they are typing
 */
export function emoteAutocomplete (interaction: AutocompleteInteraction) {
  const emoteCache = grabEmoteCache()
  if (emoteCache) {
    const query = interaction.options.getFocused(true).value
    if (typeof query === 'string') {
      const res = emoteCache.search(query)
      if (res.length > 0) {
        // if we actually get some choices back we send to cubemoji
        interaction.respond(res.slice(0, 8).map(result => {
          return { name: result.item.name, value: result.item.name }
        }))
      } else {
        // otherwise we return some random emojis
        const res = geometricReservoirSample(8, emoteCache.emojis)
        interaction.respond(res.map(result => {
          return { name: result.name, value: result.name }
        }))
      }
    }
  }
}

/**
 * edit effects autocomplete resolver
 * TODO: implement
 */
/* export function editAutocomplete (interaction: AutocompleteInteraction) {
  const query = interaction.options.getFocused(true).value
  if (typeof query === 'string') {
    const res = imgEffects.sort((a, b) => {})
  }
} */
