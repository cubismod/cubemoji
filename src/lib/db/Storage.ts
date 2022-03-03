import Database from 'better-sqlite3'
import dayjs from 'dayjs'
import { Client } from 'discordx'
import { createReadStream, createWriteStream } from 'fs'
import Keyv from 'keyv'
import { KeyvFile } from 'keyv-file'
import { resolve } from 'path'
import { createInterface } from 'readline'
import { pipeline } from 'stream'
import { container, singleton } from 'tsyringe'
import { promisify } from 'util'
import { gotOptions } from '../emote/Cmoji'
import { CubeLogger } from '../logger/CubeLogger'
const { got } = await import('got')

export interface ServerOwner {
  id: string,
  name: string
}

export interface ChannelInfo {
  channelName: string,
  guildName: string,
  guildId: string,
}

// value is raw json
export interface KeyVRaw {
  key: string,
  value: string
}

/**
 * raw keyv value item
 */
export interface ValRaw {
  value: string,
  expires: null
}

// database storage using https://github.com/zaaack/keyv-file
// we utilize a plain JSON file for blocked hosts list because it loads so quickly
// and SQLite for the other storage as its consistent
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
  trashReacts: Keyv<string>

  /**
   * Downloads a blocklist of bad hosts
   * to avoid when performing downloads
   */
  badHosts: Keyv<number>

  /**
   * server owners with key of their id
   * value is a list of servers they own
   * namespace: owners
   */
  serverOwners: Keyv<ServerOwner[]>

  /**
   * roles allowed to make changes to moderation settings
   * excluding enrollment/unenrollment of servers
   * key: guildId-roleId
   * value: role name
   */
  modEnrollment: Keyv<string>

  /**
   * key is channel id
   * value ChannelInfo interface
   */
  blockedChannels: Keyv<ChannelInfo>

  /**
   * enrolled servers stored w/ key of server unique id
   * and just user tag as value
   */
  serverEnrollment: Keyv<string>

  /**
   * key is server ID-hashofglob string
   * value is a glob statement from https://www.npmjs.com/package/micromatch
   */
  emojiBlocked: Keyv<string>

  /**
   * key is guildId, value is the audit channel
   */
  serverAuditInfo: Keyv<string>

  private location = 'data/'
  private logger = container.resolve(CubeLogger).storage
  private serverInfoPath = 'data/serverInfo.sqlite'
  constructor () {
    this.trashReacts = new Keyv<string>(
      'sqlite://data/trashReacts.sqlite',
      {
        ttl: 6.048e+8 // 1 week in ms
      }
    )

    this.badHosts = new Keyv<number>({
      store: new KeyvFile({
        filename: resolve(this.location, 'badHosts.json')
      })
    })

    const sqliteUri = 'sqlite://' + this.serverInfoPath

    this.serverEnrollment = new Keyv<string>(sqliteUri, { namespace: 'servers' })
    this.emojiBlocked = new Keyv<string>(sqliteUri, { namespace: 'emoji' })

    this.serverOwners = new Keyv<ServerOwner[]>(sqliteUri, { namespace: 'owners' })
    this.modEnrollment = new Keyv<string>(sqliteUri, { namespace: 'mods' })
    this.blockedChannels = new Keyv<ChannelInfo>(sqliteUri, { namespace: 'channels' })

    this.serverAuditInfo = new Keyv<string>(sqliteUri, { namespace: 'audit' })
  }

  async initHosts () {
    await this.badHosts.set('test', 3)
    const refreshTime = await this.badHosts.get('refresh')
    if (refreshTime === undefined || (refreshTime && Date.now() > refreshTime)) {
      // set next refresh time
      await this.badHosts.set('refresh', dayjs().add(1, 'week').valueOf())
      // time to perform a refresh
      const fn = resolve('download/', 'hosts.txt')
      const pl = promisify(pipeline)
      // downloading this blocklist
      // https://github.com/StevenBlack/hosts
      await pl(
        got.stream('http://sbc.io/hosts/alternates/porn/hosts', gotOptions),
        createWriteStream(fn)
      )

      // once we have that file we gotta parse it
      const fileStream = createReadStream(fn)
      const rlInterface = createInterface({
        input: fileStream,
        crlfDelay: Infinity
      })

      this.logger.info('initializing bad hosts list which will take a while...')
      let i = 0

      for await (const line of rlInterface) {
        const items = line.split(' ')
        if (items.length === 2 && items[0] === '0.0.0.0') {
          await this.badHosts.set(items[1], 1)
          i++

          if (i % 1000 === 0) {
            this.logger.info(`${i} records processed of ~141k`)
          }
        }
      }
    }
  }

  /**
   * load server owners into database for quick access
   * @param client Discordx client
   */
  async loadServerOwners (client: Client) {
    // reset each time
    await this.serverOwners.clear()

    client.guilds.cache.forEach(async (guild) => {
      const resolved = await guild.fetch()
      const owner = resolved.ownerId

      const guildsOwned = await this.serverOwners.get(owner)
      if (guildsOwned) {
        // server owner has changed
        guildsOwned.push({
          name: resolved.name,
          id: resolved.id
        })
        await this.serverOwners.set(owner, guildsOwned)
      } else {
        const newArr: ServerOwner[] = [
          {
            name: resolved.name,
            id: resolved.id
          }
        ]
        await this.serverOwners.set(owner, newArr)
      }
    })
    this.logger.info('Successfully refreshed guild owners')
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
  getNamespace (ns: string) {
    const db = new Database(this.serverInfoPath, { readonly: true })
    const statement = db.prepare('SELECT * FROM keyv WHERE key LIKE ?')
    const res = statement.all(ns + '%')
    try {
      // convert type to just key and value
      const converted = res.map(value => {
        const parsed = (value as KeyVRaw)
        return parsed
      })
      db.close()
      return converted
    } catch (err) {
      this.logger.error(err)
    }
    db.close()
  }
}
