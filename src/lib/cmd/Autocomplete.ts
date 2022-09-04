import { ApplicationCommandOptionChoiceData, AutocompleteInteraction } from 'discord.js';
import Fuse from 'fuse.js';
import Qty from 'js-quantities';
import { choice, geometricReservoirSample } from 'pandemonium';
import { container } from 'tsyringe';
import imgEffects from '../../res/imgEffects.json' assert {type: 'json'};
import { generateList } from '../conversion/UnitList';
import { CubeStorage } from '../db/Storage.js';
import { Cmoji, Source } from '../emote/Cmoji.js';
import { EmoteCache } from '../emote/EmoteCache.js';
import { CubeLogger } from '../observability/CubeLogger.js';

const logger = container.resolve(CubeLogger).autocomplete;

/**
 * emote autocomplete resolver, follows the user's
 * query and presents them with emotes that match
 * whatever they are typing
 */
export async function emoteAutocomplete(interaction: AutocompleteInteraction) {
  const emoteCache = container.resolve(EmoteCache);
  try {
    if (emoteCache && interaction.guildId) {
      const query = interaction.options.getFocused(true).value;
      if (typeof query === 'string' && query.length < 100) {
        const res = emoteCache.search(query);
        let firstResult = query;
        if (firstResult === '') {
          // avoid causing a discord api error as query = ''
          // when the user hasn't typed anything yet so instead
          // we choose a random emote to send as the first one
          firstResult = choice(emoteCache.emojis).name;
        }
        logger.debug(`First result: ${firstResult}`);
        if (res.length > 0) {
          const suggestions: { name: string, value: string; }[] = [{ name: firstResult, value: firstResult }];
          // if we actually get some choices back we send to cubemoji
          for (const fuseRes of res) {
            if (!await emoteCache.isBlocked(fuseRes.item.name, interaction.guildId)) {
              suggestions.push({ name: fuseRes.item.name, value: fuseRes.item.name });
            }
          }
          if (suggestions.length > 0) await interaction.respond(suggestions.slice(0, 20));
        } else {
          // otherwise we return some random emojis
          // first option should be the query itself so if the
          // user is typing a URL or custom nitro emote
          // they still have an option to send that
          let suggestions: Cmoji[] = [];
          if (firstResult.length < 100) {
            suggestions = [new Cmoji(null, firstResult, firstResult, Source.URL)];
          }
          const randomEmojis = await emoteCache.randomChoice(20, interaction.guildId);
          const res = suggestions.concat([...randomEmojis]);
          await interaction.respond(res.map(result => {
            return { name: result.name, value: result.name };
          }));
        }
      }
    }
  } catch (err: unknown) {
    logger.error(err);
  }
}

/**
 * edit effects autocomplete resolver
 * first step is determining the list of effects the user has typed, if any
 * then we determine suggestions based on their query
 * and finally create a list of suggestions adding onto their current valid
 * list
 */
export async function editAutocomplete(interaction: AutocompleteInteraction) {
  const query = interaction.options.getFocused(true).value;
  try {
    if (query === '') {
      const opts = geometricReservoirSample(8, imgEffects);
      // return a random option suggestion
      // when nothing typed yet
      await interaction.respond(opts.map(result => {
        return { name: result, value: result };
      }));
    } else {
      // something has been typed in the query
      // determine the effects the user has listed so far
      const queryArr = query.split(' ');
      const fuse = new Fuse(imgEffects);
      // api limits responses to 100 chars so we have a conservative
      // limit in place for suggestions
      if (queryArr.length > 1 && queryArr.length < 11) {
        // multiple effects listed already
        const last = queryArr.pop();
        if (last) {
          // search based on the last element
          const searchRes = fuse.search(last, { limit: 8 });
          // remove the fuse metadata from the search results
          const defused = searchRes.map((res) => {
            return res.item;
          });
          if (queryArr.length < 10) {
            defused.push(geometricReservoirSample(2, imgEffects).join(' '));
          }
          interaction.respond(defused.map(result => {
            const suggestions = queryArr.slice();
            suggestions.push(result);
            return { name: suggestions.join(' '), value: suggestions.join(' ') };
          })).catch(reason => logger.error(reason));
        }
      } else {
        // user is working on typing their first effect so we return some options
        // that match
        const res = fuse.search(query, { limit: 8 });
        await interaction.respond(res.map(result => {
          return { name: result.item, value: result.item };
        }));
      }
    }
  } catch (err) {
    logger.error(err);
  }
}

/**
 * performs autocomplete of server names
 * returned autocomplete values are the id - then truncated name
 * @param interaction
 */
export async function serverAutocomplete(interaction: AutocompleteInteraction) {
  const query = interaction.options.getFocused(true).value;
  try {
    const storage = container.resolve(CubeStorage);
    const guilds = await storage.serverOwners.get(interaction.user.id);
    const responses: ApplicationCommandOptionChoiceData[] = [];
    if (guilds) {
      guilds.forEach(guild => {
        const name = guild.id + '-' + guild.name.slice(0, 60);
        // try not to go over autocomplete limits
        if (responses.length < 10) {
          responses.push({
            name,
            value: name
          });
        }
      });
      await interaction.respond(responses);
    }
  } catch (err) {
    logger.error(err);
  }
}

/**
 * autocomplete for /convert function
 */
export async function unitAutocomplete(interaction: AutocompleteInteraction) {
  const query = interaction.options.getFocused(true).value;
  try {
    if (query === '') {
      // return well known units if nothing inputted
      await interaction.respond(geometricReservoirSample<string>(25, Qty.getUnits()).map(kind => {
        return { name: kind, value: kind };
      }));
    } else {
      const units = await generateList();
      if (units) {
        const fuse = new Fuse<string>(units);
        const res = fuse.search(query, { limit: 10 });

        await interaction.respond(res.map(result => {
          return { name: result.item, value: result.item };
        }));
      }
    }
  } catch (err) {
    logger.error(err);
  }
}
