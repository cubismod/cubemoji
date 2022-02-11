import dayjs from 'dayjs'
import { createReadStream, createWriteStream } from 'fs'
import Keyv from 'keyv'
import { KeyvFile } from 'keyv-file'
import { resolve } from 'path'
import { createInterface } from 'readline'
import { pipeline } from 'stream'
import { singleton } from 'tsyringe'
import { promisify } from 'util'
import { gotOptions } from './Cubemoji'
const { got } = await import('got')

// database storage using https://github.com/zaaack/keyv-file
@singleton()
export class CubeStorage {
  trashReacts: Keyv<string>
  badHosts: Keyv<number>
  private location = 'data/'

  constructor () {
    /*
    Database that is persisting the info for little trash icons you see
    under images edited by cubemoji
    - key: message snowflake ID from Discord
    - value: author snowflake ID
    Author is the user who reacted to the image not whoever
    posted the image
    */
    this.trashReacts = new Keyv<string>({
      store: new KeyvFile({
        filename: resolve(this.location, 'trashReacts.json'),
        writeDelay: 100
      }),
      // 1 week in ms
      ttl: 6.048e+8
    })

    /**
     * Downloads a blocklist of bad hosts
     * to avoid when performing downloads
     */
    this.badHosts = new Keyv<number>({
      store: new KeyvFile({
        filename: resolve(this.location, 'badHosts.json')
      })
    })
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

      console.log('initializing bad hosts list which will take a while...')
      let i = 0

      for await (const line of rlInterface) {
        const items = line.split(' ')
        if (items.length === 2 && items[0] === '0.0.0.0') {
          await this.badHosts.set(items[1], 1)
          i++

          if (i % 1000 === 0) {
            console.log(`${i} records processed of ~141k`)
          }
        }
      }
    }
  }
}
