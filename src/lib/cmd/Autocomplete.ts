import { ApplicationCommandOptionChoice, AutocompleteInteraction } from 'discord.js'
import Fuse from 'fuse.js'
import { choice, geometricReservoirSample } from 'pandemonium'
import { container } from 'tsyringe'
import imgEffects from '../../res/imgEffects.json'
import { CubeStorage } from '../db/Storage'
import { Cmoji, Source } from '../emote/Cmoji'
import { EmoteCache } from '../emote/EmoteCache'
import { logManager } from '../LogManager'

const logger = logManager().getLogger('Autocomplete')

// useful autocomplete commands for discord functions

/**
 * emote autocomplete resolver, follows the user's
 * query and presents them with emotes that match
 * whatever they are typing
 */
export function emoteAutocomplete (interaction: AutocompleteInteraction) {
  const emoteCache = container.resolve(EmoteCache)
  try {
    if (emoteCache) {
      const query = interaction.options.getFocused(true).value
      if (typeof query === 'string' && query.length < 100) {
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
          let queryItem: Cmoji[] = []
          if (firstResult.length < 100) {
            queryItem = [new Cmoji(null, firstResult, firstResult, Source.URL)]
          }
          const randomEmojis = geometricReservoirSample(10, emoteCache.emojis)
          const res = queryItem.concat(randomEmojis)
          interaction.respond(res.map(result => {
            return { name: result.name, value: result.name }
          }))
        }
      }
    }
  } catch (err: unknown) {
    logger.error(err)
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
    try {
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
        const queryArr = query.split(' ')
        const fuse = new Fuse(imgEffects)
        // api limits responses to 100 chars so we have a conservative
        // limit in place for suggestions
        if (queryArr.length > 1 && queryArr.length < 11) {
          // multiple effects listed already
          const last = queryArr.pop()
          if (last) {
            // search based on the last element
            const searchRes = fuse.search(last, { limit: 8 })
            // remove the fuse metadata from the search results
            const defused = searchRes.map((res) => { return res.item })
            if (queryArr.length < 10) {
              defused.push(geometricReservoirSample(2, imgEffects).join(' '))
            }
            interaction.respond(defused.map(result => {
              const suggestions = queryArr.slice()
              suggestions.push(result)
              return { name: suggestions.join(' '), value: suggestions.join(' ') }
            })).catch(reason => logger.error(reason))
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
    } catch (err) {
      logger.error(err)
    }
  }
}

/**
 * performs autocomplete of server names
 * returned autocomplete values are the id - then truncated name
 * @param interaction
 */
export async function serverAutocomplete (interaction: AutocompleteInteraction) {
  const query = interaction.options.getFocused(true).value
  if (typeof query === 'string') {
    try {
      const storage = container.resolve(CubeStorage)
      const guilds = await storage.serverOwners.get(interaction.user.id)
      const responses: ApplicationCommandOptionChoice[] = []
      if (guilds) {
        guilds.forEach(guild => {
          const name = guild.id + '-' + guild.name.slice(0, 60)
          // try not to go over autocomplete limits
          if (responses.length < 10) {
            responses.push({
              name: name,
              value: name
            })
          }
        })
        await interaction.respond(responses)
      }
    } catch (err) {
      logger.error(err)
    }
  }
}
