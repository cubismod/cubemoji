import Database from 'better-sqlite3';
import { Client } from 'discordx';
import Keyv from 'keyv';
import { container, singleton } from 'tsyringe';
import { ModAction } from '../cmd/ModHelper.js';
import { Milliseconds } from '../constants/Units.js';
import { CubeLogger } from '../logger/CubeLogger.js';

export interface ServerOwner {
  id: string,
  name: string;
}

export interface ChannelInfo {
  channelName: string,
  guildName: string,
  guildId: string,
}

// value is raw json
export interface KeyVRaw {
  key: string,
  value: string;
}

/**
 * raw keyv value item
 */
export interface ValRaw {
  value: string,
  expires: null;
}

/* database storage using https://github.com/zaaack/keyv-file
  we utilize a plain JSON file for blocked hosts list because it loads so quickly
  and SQLite for the other storage as its consistent

  NAMESPACES
  servers - Servers enrolled in Big Server mode
  emoji - Blocked emojis in BSM
  owners - Server owners
  mods - Roles with moderation access in BSM
  channels - Blocked channels in BSM
  server-anon - Used in the emoji list webpage for persistent randomized server names
  actions - lists of pending mod actions for BSM
  timeouts - timeouts for big server mode, see https://gitlab.com/cubismod/cubemoji/-/issues/23#note_906825698

*/
@singleton()
export class CubeStorage {
  /*
    Database that is persisting the info for little trash icons you see
    under images edited by cubemoji
    - key: message snowflake ID from Discord
    - value: author snowflake ID
    Author is the user who reacted to the image not whoever
    posted the image
    */
  trashReacts: Keyv<string>;

  /**
   * server owners with key of their id
   * value is a list of servers they own
   * namespace: owners
   */
  serverOwners: Keyv<ServerOwner[]>;

  /**
   * roles allowed to make changes to moderation settings
   * excluding enrollment/unenrollment of servers
   * key: guildId-roleId
   * value: role name
   */
  modEnrollment: Keyv<string>;

  /**
   * key is channel id
   * value ChannelInfo interface
   */
  blockedChannels: Keyv<ChannelInfo>;

  /**
   * enrolled servers stored w/ key of server unique id
   * and just user tag of owner as value
   */
  serverEnrollment: Keyv<string>;

  /**
   * key is server ID-hashofglob string
   * value is a glob statement from https://www.npmjs.com/package/micromatch
   */
  emojiBlocked: Keyv<string>;

  /**
   * key is guildId, value is the audit channel
   */
  serverAuditInfo: Keyv<string>;

  /**
   * key is guildId, value is a random server name
   */
  serverAnonNames: Keyv<string>;

  /**
   * lists of moderation actions
   * key is message id, value is ModAction[]
   */
  pendingModActions: Keyv<ModAction[]>;

  // key is channelID_cm
  // or channelID_all
  // where CM values track timeouts between cubemoji messages and
  // overall tracks the overall timeout of messages in a particular channel
  // values are time values in milliseconds since Unix epoch
  timeouts: Keyv<number>;

  private logger = container.resolve(CubeLogger).storage;
  // in testing mode, we are saving data to data/test/
  dbLocation = 'data/';
  private serverInfoPath: string;
  constructor() {
    // create separate databases when testing
    if (process.env.CM_TEST === 'true') this.dbLocation = 'data/test/';
    this.serverInfoPath = this.dbLocation + 'serverInfo.sqlite';

    this.trashReacts = new Keyv<string>(
      `sqlite://${this.dbLocation}trashReacts.sqlite`,
      {
        ttl: 6.048e+8 // 1 week in ms
      }
    );

    const sqliteUri = 'sqlite://' + this.serverInfoPath;

    this.serverEnrollment = new Keyv<string>(sqliteUri, { namespace: 'servers' });
    this.emojiBlocked = new Keyv<string>(sqliteUri, { namespace: 'emoji' });

    this.serverOwners = new Keyv<ServerOwner[]>(sqliteUri, { namespace: 'owners' });
    this.modEnrollment = new Keyv<string>(sqliteUri, { namespace: 'mods' });
    this.blockedChannels = new Keyv<ChannelInfo>(sqliteUri, { namespace: 'channels' });
    this.serverAnonNames = new Keyv<string>(sqliteUri, { namespace: 'server-anon' });

    this.serverAuditInfo = new Keyv<string>(sqliteUri, { namespace: 'audit' });

    this.pendingModActions = new Keyv<ModAction[]>(sqliteUri, { namespace: 'actions', ttl: Milliseconds.day });

    this.timeouts = new Keyv<number>(sqliteUri, { namespace: 'timeouts', ttl: Milliseconds.fiveMin });
  }

  /**
   * load server owners into database for quick access
   * @param client Discordx client
   */
  async loadServerOwners(client: Client) {
    // reset each time
    await this.serverOwners.clear();

    client.guilds.cache.forEach(async (guild) => {
      const resolved = await guild.fetch();
      const owner = resolved.ownerId;

      const guildsOwned = await this.serverOwners.get(owner);
      if (guildsOwned) {
        // server owner has changed
        guildsOwned.push({
          name: resolved.name,
          id: resolved.id
        });
        await this.serverOwners.set(owner, guildsOwned);
      } else {
        const newArr: ServerOwner[] = [
          {
            name: resolved.name,
            id: resolved.id
          }
        ];
        await this.serverOwners.set(owner, newArr);
      }
    });
    this.logger.info('Successfully refreshed guild owners');
  }

  /**
   * KeyV does not currently support iteration of all keys although this
   * feature is being worked on. So instead, we use some SQLite to actually
   * grab all the values of a particular namespace and return the results
   * We leave it to the caller to parse the resulting JSON value
   *
   * Eventually, this will be removed once actual iterator functionality is added
   * to the NPM package for keyv
   * @param ns namespace such as emojis, serverOwners
   * @returns key value pairs or undefined if no results found
   */
  getNamespace(ns: string) {
    const db = new Database(this.serverInfoPath, { readonly: true });
    const statement = db.prepare('SELECT * FROM keyv WHERE key LIKE ?');
    const res = statement.all(ns + '%');
    try {
      // convert type to just key and value
      const converted = res.map(value => {
        const parsed = (value as KeyVRaw);
        return parsed;
      });
      db.close();
      return converted;
    } catch (err) {
      this.logger.error(err);
    }
    db.close();
  }
}
