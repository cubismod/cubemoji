import AWS from 'aws-sdk';
import Database from 'better-sqlite3';
import { GuildMember } from 'discord.js';
import { Client } from 'discordx';
import { readFile } from 'fs/promises';
import Keyv from 'keyv';
import path from 'path';
import { container, singleton } from 'tsyringe';
import { ModAction, RolePicker } from '../cmd/ModHelper.js';
import { Milliseconds } from '../constants/Units.js';
import { EphemeralLink } from '../http/RoleManager.js';
import { CubeLogger } from '../observability/CubeLogger.js';

/* eslint-disable no-unused-vars */
export enum BucketContentType {
  Path,
  Text
}
/* eslint-enable */

/**
 * server ID and name
 */
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

/**
 * ends is a UTC timestamp for when the rate limit ends
 * multiple is how many times the rate limit has been triggered,
 * which is used to determine the next rate limit period
 */
export interface RateLimitVal {
  ends: number,
  multiple: number
}

/* database storage using https://github.com/zaaack/keyv-file
  we utilize a plain JSON file for blocked hosts list because it loads so quickly
  and SQLite for the other storage as its consistent

  NAMESPACES
  see below

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

  // key is serverID and value boolean indicating if enabled and
  // role picker in a JSON equivalent format
  rolePickers: Keyv<[boolean, RolePicker]>;

  // key is serverID-userID and value
  ephemeralLinks: Keyv<EphemeralLink>;

  // key is the link name and value is the corresponding key in
  // the ephemeralLinks namespace
  uniqueIDLookup: Keyv<string>;

  members: Map<string, GuildMember>;

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

    const serverInfoPath = 'sqlite://' + this.serverInfoPath;

    this.serverEnrollment = new Keyv<string>(serverInfoPath, { namespace: 'servers' });
    this.emojiBlocked = new Keyv<string>(serverInfoPath, { namespace: 'emoji' });

    this.serverOwners = new Keyv<ServerOwner[]>(serverInfoPath, { namespace: 'owners' });
    this.modEnrollment = new Keyv<string>(serverInfoPath, { namespace: 'mods' });
    this.blockedChannels = new Keyv<ChannelInfo>(serverInfoPath, { namespace: 'channels' });
    this.serverAnonNames = new Keyv<string>(serverInfoPath, { namespace: 'server-anon' });

    this.serverAuditInfo = new Keyv<string>(serverInfoPath, { namespace: 'audit' });

    this.pendingModActions = new Keyv<ModAction[]>(serverInfoPath, { namespace: 'actions', ttl: Milliseconds.day });

    this.rolePickers = new Keyv<[boolean, RolePicker]>(serverInfoPath, { namespace: 'rolepicker' });

    this.ephemeralLinks = new Keyv<EphemeralLink>(serverInfoPath, { namespace: 'eph', ttl: Milliseconds.twentyMin });

    this.uniqueIDLookup = new Keyv<string>(serverInfoPath, { namespace: 'idlookup', ttl: Milliseconds.twentyMin });

    this.members = new Map<string, GuildMember>();
  }

  /**
   * load server owners into database for quick access
   * @param client Discordx client
   */
  async loadServerOwners(client: Client) {
    // reset each time
    await this.serverOwners.clear();

    const botOwner = process.env.CM_BOTOWNER;
    const botOwnerGuilds: ServerOwner[] = [];

    for (const guild of client.guilds.cache) {
      const resolved = await guild[1].fetch();
      const owner = resolved.ownerId;

      const guildsOwned = await this.serverOwners.get(owner);
      if (botOwner) {
        botOwnerGuilds.push({
          id: resolved.id,
          name: resolved.name
        });
      }

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
    }
    if (botOwner) {
      await this.serverOwners.set(botOwner, botOwnerGuilds);
    }
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

/**
 * Connect to an S3 client for backups and some storage.
 * Put only client, no other functionality available.
 * Several environment variables required, which are described
 * in .example.env
 */
@singleton()
export class S3Client {
  private s3?:AWS.S3;
  private logger = container.resolve(CubeLogger).storage;

  constructor() {
    if (
      process.env.CM_ACCESS_KEY_ID &&
      process.env.CM_SECRET_ACCESS_KEY &&
      process.env.CM_REGION &&
      process.env.CM_S3_ENDPOINT
    ) {
      AWS.config.credentials = {
        accessKeyId: process.env.CM_ACCESS_KEY_ID,
        secretAccessKey: process.env.CM_SECRET_ACCESS_KEY
      };

      AWS.config.region = process.env.CM_REGION;

      const ep = new AWS.Endpoint(process.env.CM_S3_ENDPOINT);
      this.s3 = new AWS.S3({
        endpoint: ep
      });
    } else {
      throw (new Error('Missing S3 secrets in environment variables! See example.env for description of required variables'));
    }
  }

  async put(bucketPath: string, bucket: string, content: string, type:BucketContentType) {
    try {
      switch (type) {
        case BucketContentType.Path: {
          const file = await readFile(path.resolve(content));

          const res = await this.s3?.putObject({
            Bucket: bucket,
            Key: bucketPath,
            Body: file
          }).promise();
          this.logger.debug(res);
          break;
        }
        case BucketContentType.Text: {
          const res2 = await this.s3?.putObject({
            Bucket: bucket,
            Key: bucketPath,
            Body: content
          }).promise();

          this.logger.info(`Uploaded to S3: ${JSON.stringify(res2)}.\nBucket: ${bucket}, Path: ${bucketPath}`);
          break;
        }
      }
    } catch (err) {
      this.logger.error(err);
    }
  }
}
