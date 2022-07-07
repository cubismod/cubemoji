/* eslint-disable new-cap */
// emote cache and some helper functions
import { GuildEmoji } from 'discord.js';
import { Client } from 'discordx';
import { fileTypeFromStream } from 'file-type';
import Fuse from 'fuse.js';
import pkg from 'micromatch';
import hash from 'node-object-hash';
import { choice } from 'pandemonium';
import { container, singleton } from 'tsyringe';
import { parse } from 'twemoji-parser';
import mutantNames from '../../res/emojiNames.json' assert { type: 'json' };
import { CubeStorage, ValRaw } from '../db/Storage.js';
import { CubeLogger } from '../observability/CubeLogger.js';
import { Cmoji, Source } from './Cmoji.js';

const { got } = await import('got');
const { isMatch } = pkg;

@singleton()
// a class which can return an array version of emotes
// and also only refreshes when necessary
export class EmoteCache {
  emojis: Cmoji[];
  sortedArray: string[]; // sorted list of emoji names
  discEmojis: Cmoji[]; // save references to discord emojis for functions that wouldn't work well w/ images
  mutantEmojis: Cmoji[]; // references to mutant emojis
  /**
   * we maintain blocked emojis both in the database for persistent use as well as in
   * memory for quick access
   *
   * key - guild ID, value - set of emoji globs
   */
  private blockedEmoji: Map<string, Set<string>>;
  private storage = container.resolve(CubeStorage);

  private discFuse: Fuse<Cmoji>;
  private allFuse: Fuse<Cmoji>;
  private fuseOpts = {
    keys: ['name', 'id'],
    useExtendedSearch: true,
    minMatchCharLength: 1,
    threshold: 0.3,
    fieldNormWeight: 1
  };

  private logger = container.resolve(CubeLogger).emoteCache;

  constructor() {
    this.emojis = [];
    this.sortedArray = []; // sorted list of emoji names
    this.discEmojis = [];
    this.mutantEmojis = [];

    this.blockedEmoji = new Map<string, Set<string>>();

    this.discFuse = new Fuse(this.discEmojis, this.fuseOpts);
    this.allFuse = new Fuse(this.emojis, this.fuseOpts);
  }

  /**
   * initializes the class by copying the client emoji list,
   * performing de-duplication of emote names, extracting
   * emojis into separate list, and sorting the main list
   */
  async init(client: Client) {
    // setup emoji cache and fix duplicate names
    this.emojis = await this.grabEmotes(client);
    this.deduper();
    this.extractEmojis();
    this.sortArray();

    this.allFuse = new Fuse(this.emojis, this.fuseOpts);
    this.discFuse = new Fuse(this.emojis, this.fuseOpts);
  }

  /**
   * copies discord client emojis as well as adds Mutant emojis
   * @returns list of all emojis
   */
  private async grabEmotes(client: Client) {
    const emojis: Cmoji[] = [];
    await client.guilds.fetch();
    // add discord emojis
    client.guilds.cache.forEach(guild => {
      for (const emoji of guild.emojis.cache.values()) {
        emojis.push(new Cmoji(emoji));
      }
    });
    const baseUrl = process.env.CM_EXTEMOJI ? process.env.CM_EXTEMOJI : 'https://storage.googleapis.com/cubemoji.appspot.com/mutant-emotes/';
    // then add mutant emojis
    mutantNames.forEach(emoji => {
      const url = baseUrl + emoji;
      // remove the file extension
      const name = emoji.slice(0, -4);
      emojis.push(new Cmoji(null, name, url, Source.Mutant));
    });
    return emojis;
  }

  /**
 * Adds an emote to the list, does not perform sorting
 * @param emote the emote to add
 */
  async addEmote(emote: GuildEmoji) {
    this.logger.info(`new emoji registered: ${emote.name}`);
    const newEmote = new Cmoji(emote);
    this.emojis.push(newEmote);
    this.discEmojis.push(newEmote);

    this.allFuse.add(newEmote);
    this.discFuse.add(newEmote);
  }

  /**
   * removes an emote from the list,
   * checks using the emoji's ID
   * @param emote emote that you want to remove
   */
  async removeEmote(emote: GuildEmoji) {
    const res = this.search(emote.id);
    if (res.length > 0 && res[0].item.id === emote.id) {
      this.emojis.splice(res[0].refIndex, 1);
      this.logger.info(`emoij removed: ${emote.name}`);
    }
  }

  /**
 * edit an emoji by removing the old one and adding a new one
 * again, does this using emote ids
 * @param oldEmote emote to remove
 * @param newEmote emote to add
 */
  async editEmote(oldEmote: GuildEmoji, newEmote: GuildEmoji) {
    // just remove and add!
    await this.removeEmote(oldEmote);
    await this.addEmote(newEmote);
  }

  /**
   * searches the emote cache for a match
   * @param query search either by name or emote id
   * @returns a list of results
   */
  search(query: string) {
    return (this.allFuse.search(query));
  }

  /**
 * search limited only to Discord emoji
 * @param query emoji name or id
 * @returns a list of results
 */
  searchDiscord(query: string) {
    return (this.discFuse.search(query));
  }

  /**
   * returns an emote based on name or if the user sent an
   * emote object in their message, we return that emote object
   * if it is a nitro emote then we return a URL to the emote image
   * @param identifier an emote name or message content
   * @param guildId guild ID to perform filtering if necessary
   * @returns a Cmoji or undefined if we can't find an emote
   */
  async retrieve(identifier: string, guildId: string) {
    // discord emojis are represented in text
    // like <:flass:781664252058533908>
    // so we split to get the components including name and ID
    if (!await this.isBlocked(identifier, guildId)) {
      const split = identifier.slice(1, -1).split(':');
      // search by ID or name w/ fuse's extended syntax https://fusejs.io/examples.html#extended-search
      if (split.length > 2) identifier = `${split[2]}|${split[1]}`;
      const searchResults = await this.search(identifier);
      // want an exact match
      if (searchResults.length > 0 && searchResults[0].item.id === split[2]) return searchResults[0].item;
      // now we see if we have a nitro emote cubemoji doesn't have in its guilds
      if (split.length > 2) {
        const url = `https://cdn.discordapp.com/emojis/${split[2]}`;
        // see if the URL will resolve
        try {
          const stream = await got.stream(url);
          const fileType = await fileTypeFromStream(stream);
          // include the extension so Discord animates actual animated emotes
          if (fileType) return new Cmoji(null, split[1], `${url}.${fileType.ext}`, Source.URL);
        } catch {
          // don't do anything on error, means that this is not a nitro emote
        }
      }
      // try to parse a twemoji
      const twemoji = this.parseTwemoji(identifier);
      if (twemoji !== '') return new Cmoji(null, identifier, twemoji, Source.URL);
      // last resort, return a similar emoji
      if (searchResults.length > 0) return searchResults[0].item;
    }
    return undefined; // nothing found at all
  }

  /**
   * returns a set of random emotes
   * with filtering around guildIds
   * not guaranteed to return as many copies as you specify
   * if there are a small amount of emojis to go through
   * @param items how many emotes to return
   * @param guildId guild ID for filtering if enabled
   * @param discord flag to set if you only want to return discord emoji
   */
  async randomChoice(items: number, guildId: string, discord = false) {
    const emotes = new Set<Cmoji>();
    let j = 0;
    for (let i = 0; i < items; i++) {
      const emoteList = discord ? this.discEmojis : this.emojis;

      const emote = choice(emoteList);
      // avoid an infinite loop case if we have blocked emoji and the list of emoji
      // is small so we can quickly iterate through them
      if (!await this.isBlocked(emote.name, guildId) && j < emoteList.length && !emotes.has(emote)) {
        emotes.add(emote);
      }
      j++;
    }
    return emotes;
  }

  /**
   * for parsing a twemoji
   * @param body message body
   * @returns url
   */
  parseTwemoji(body: string) {
    const entitites = parse(body, { assetType: 'png' });
    if (entitites.length !== 0) return entitites[0].url;
    else return '';
  }

  /**
 * iterates through emojis and ensures they each have a unique name
 */
  private deduper() {
    // keep track of each name and the increments on it
    const names = new Map<string, number>();
    this.emojis.forEach((emoji, index) => {
      let inc: number | undefined = 0;
      if (emoji.name && names.has(emoji.name.toLowerCase())) {
        // perform a name change
        inc = names.get(emoji.name.toLowerCase());
        if (inc !== undefined) {
          ++inc;
          // save reference to original name
          const ogName = emoji.name;
          this.emojis[index].name = `${emoji.name}_${inc}`;
          names.set(ogName.toLowerCase(), inc);
        }
      } else if (emoji.name) {
        names.set(emoji.name.toLowerCase(), inc);
      }
    });
  }

  /**
   * extracts Mutant and Discord emojis
   * and places each into their own sorted arrays
   */
  private extractEmojis() {
    const discord: Cmoji[] = [];
    const mutant: Cmoji[] = [];
    this.emojis.forEach(emoji => {
      switch (emoji.source) {
        case (Source.Discord):
          discord.push(emoji);
          break;
        case (Source.Mutant):
          mutant.push(emoji);
          break;
      }
    });
    // now sort each array
    // on name values
    this.discEmojis = discord.sort((a, b) => a.name.localeCompare(b.name));
    this.mutantEmojis = mutant.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * sorts the emoji array in place
   */
  private sortArray() {
    this.emojis = this.emojis.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * block or unblock an emoji
   * performs this step both on in memory struct and (optionally) database
   * @param glob emoji to block
   * @param serverId id of server this emoji shouldn't show up on
   * @param block true for blocking, false for unblocking
   * @param database perform database operations with this? default: false
   * @returns true if glob can be added, false if it can't bc of size limit
   */
  async modifyBlockedEmoji(glob: string, serverId: string, block = true, database = false) {
    const vals = this.blockedEmoji.get(serverId);
    /**
     * limit of 50 blocks per guild
     */
    if (vals) {
      if (vals.size < 51) {
        // vals exists so we can append because its also doesn't have more than 50 emoji
        if (block) this.blockedEmoji.set(serverId, vals.add(glob));
        else await this.blockedEmoji.delete(serverId);
        if (database) await this.modifyEmojiDB(glob, serverId, block);
      } else {
        // too large
        return false;
      }
    } else {
      // no val set
      if (block) this.blockedEmoji.set(serverId, new Set<string>().add(glob));
      if (database) await this.modifyEmojiDB(glob, serverId, block);
    }

    return true;
  }

  private async modifyEmojiDB(glob: string, serverId: string, block: boolean) {
    const blockedEmojis = this.storage.emojiBlocked;
    const key = serverId + '-' + hash().hash(glob);
    if (block) await blockedEmojis.set(key, glob);
    else await blockedEmojis.delete(key);
  }

  /**
   * load blocked emojis from database
   */
  loadBlockedEmojis() {
    const dbEmoji = this.storage.getNamespace('emoji');
    if (dbEmoji) {
      dbEmoji.forEach((emoji) => {
        // parse the key
        // which is in the format emoji:serverid_emojinamehash
        const split = emoji.key.split(':');
        if (split.length > 1) {
          const idAndHash = split[1].split('-');
          if (idAndHash.length > 0) {
            // idAndName[0] = id
            // parse the value as well
            const parsedVal: ValRaw = JSON.parse(emoji.value);
            this.modifyBlockedEmoji(parsedVal.value, idAndHash[0], true, false);
          }
        }
      });
    }
    this.logger.info('loaded blocked emojis from database to memory');
  }

  /**
   * validate whether an emoji is blocked
   * on a particular guild
   * also checks against database which is
   * why it is async
   * @param name emoji name
   * @param guildId guild ID
   * @returns true if blocked/ f if not blocked
   */
  async isBlocked(name: string, guildId: string) {
    const enrollment = this.storage.serverEnrollment;

    const globSet = this.blockedEmoji.get(guildId);
    if (globSet && await enrollment.get(guildId)) {
      // using micromatch
      for (const glob of globSet) {
        if (isMatch(name, glob)) return true;
      }
    }
    return false;
  }
}
