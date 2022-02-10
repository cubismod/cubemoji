import { AutocompleteInteraction } from 'discord.js'
import { choice, geometricReservoirSample } from 'pandemonium'
import { Cmoji, Source } from './Cubemoji'
import imgEffects from '../res/imgEffects.json'
import Fuse from 'fuse.js'
import { container } from 'tsyringe'
import { EmoteCache } from './EmoteCache'
// useful autocomplete commands for discord functions

/**
 * emote autocomplete resolver, follows the user's
 * query and presents them with emotes that match
 * whatever they are typing
 */
export function emoteAutocomplete (interaction: AutocompleteInteraction) {
  const emoteCache = container.resolve(EmoteCache)
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
 * first step is determining the list of effects the user has typed, if any
 * then we determine suggestions based on their query
 * and finally create a list of suggestions adding onto their current valid
 * list
 */
export function editAutocomplete (interaction: AutocompleteInteraction) {
  const query = interaction.options.getFocused(true).value
  if (typeof query === 'string') {
    if (query === '') {
      const opts = geometricReservoirSample(8, imgEffects)
      // return a random option suggestion
      // when nothing typed yet
      interaction.respond(opts.map(result => {
        return { name: result, value: result }
      }))
    } else {
      // something has been typed in the query
      // determine the effects the user has listed so far
      const effects = query.split(' ')
      const fuse = new Fuse(imgEffects)
      // api limits responses to 100 chars so we have a conservative
      // limit in place for suggestions
      if (effects.length > 1 && effects.length < 11) {
        // multiple effects listed already
        const last = effects.pop()
        if (last) {
          // search based on the last element
          const res = fuse.search(last, { limit: 8 })
          interaction.respond(res.map(result => {
            const suggestions = effects.slice()
            suggestions.push(result.item)
            return { name: suggestions.join(' '), value: suggestions.join(' ') }
          })).catch(reason => console.error(reason))
        }
      } else {
        // user is working on typing their first effect so we return some options
        // that match
        const res = fuse.search(query, { limit: 8 })
        interaction.respond(res.map(result => {
          return { name: result.item, value: result.item }
        }))
      }
    }
  }
}
