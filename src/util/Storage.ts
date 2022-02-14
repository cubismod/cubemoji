import dayjs from 'dayjs'
import { Client } from 'discordx'
import { createReadStream, createWriteStream } from 'fs'
import Keyv from 'keyv'
import { KeyvFile } from 'keyv-file'
import { Logger } from 'log4js'
import { resolve } from 'path'
import { createInterface } from 'readline'
import { pipeline } from 'stream'
import { singleton } from 'tsyringe'
import { promisify } from 'util'
import { gotOptions } from './Cubemoji'
import { logManager } from './LogManager'
const { got } = await import('got')

export interface GuildOwner {
  id: string,
  name: string
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
   */
  serverOwners: Keyv<GuildOwner[]>

  /**
   * enrolled servers stored w/ key of server unique id
   * and just a blank value
   */
  enrollment: Keyv<string>

  /**
   * plain emoji like "plead" for example
   * that should be blocked for servers in big server mod
   */
  emojiBlocked: Keyv<string>

  private location = 'data/'
  private logger: Logger
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

    this.enrollment = new Keyv<string>('sqlite://data/serverInfo.sqlite', { namespace: 'servers' })
    this.emojiBlocked = new Keyv<string>('sqlite://data/serverInfo.sqlite', { namespace: 'emoji' })

    this.logger = logManager().getLogger('Storage')
    this.serverOwners = new Keyv<GuildOwner[]>('sqlite://data/serverInfo.sqlite', { namespace: 'owners' })
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
        const newArr: GuildOwner[] = [
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
}
