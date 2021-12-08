import { AutocompleteInteraction } from 'discord.js'
import { choice, geometricReservoirSample } from 'pandemonium'
import { grabEmoteCache } from './CommandHelper'
import { Cmoji, Source } from './Cubemoji'
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
        // first option should be the query itself so if the
        // user is typing a URL or custom nitro emote
        // they still have an option to send that
        let firstResult = query
        if (firstResult === '') {
          // avoid causing a discord api error as query = ''
          // when the user hasn't typed anything yet so instead
          // we choose a random emote to send as the first one
          firstResult = choice(emoteCache.emojis).name
        }
        const queryItem = [new Cmoji(firstResult, firstResult, Source.URL)]
        const res = queryItem.concat(geometricReservoirSample(8, emoteCache.emojis))
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
