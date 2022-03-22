import dayjs from 'dayjs'
import { createReadStream, createWriteStream } from "fs"
import { stat } from "fs/promises"
import { choice } from "pandemonium"
import { resolve } from "path"
import { createInterface } from "readline"
import { pipeline } from "stream"
import { container } from "tsyringe"
import { promisify } from "util"
import { gotOptions } from "../emote/Cmoji"
import { CubeLogger } from "../logger/CubeLogger"
const { got } = await import('got')

// persist this file between restarts of bot
const filename = resolve('data/', 'hosts.txt')

export class BadHosts {
  private cache: Map<string, boolean> = new Map()
  private logger = container.resolve(CubeLogger).web

  async downloadList () {
    let downloadFile = false
    // check if blocklist exists
    try {
      const stats = await stat(filename)
      if (dayjs(stats.ctime) < dayjs().subtract(1, 'week')) downloadFile = true
    } catch {
      downloadFile = true
    }

    if (downloadFile) {
      const pl = promisify(pipeline)
      // downloading this blocklist
      // https://github.com/StevenBlack/hosts
      try {
        await pl(
          got.stream('http://sbc.io/hosts/alternates/porn/hosts', gotOptions),
          createWriteStream(filename)
        )
      } catch(err) {
        this.logger.error(err)
        // fatal flaw!
        throw(err)
        }
    }
  }

  private cacheAdd (item: {
    hostname: string,
    blocked: boolean
  }) {
    if (this.cache.size > 1000) {
      const key = choice(Array.from(this.cache))[0]
      this.cache.delete(key)
    }
    this.cache.set(item.hostname, item.blocked)
  }

  async checkHost(host: string) {
    // check against cache
    const cached = this.cache.get(host)
    
    if (cached === true) return true
    else if (cached === false) return false
    else {
      const rl = createInterface({
        input: createReadStream(filename),
        crlfDelay: Infinity
      })
    
      for await(const line of rl) {
        const split = line.split(' ')
        if(split.length > 1 && split[0] == '0.0.0.0' && split[1] === line) {
          this.cacheAdd({
            hostname: host,
            blocked: true
          })
          return true
        }
      }
      this.cacheAdd({
        hostname: host,
        blocked: false
      })
      return false
    }
  }
}