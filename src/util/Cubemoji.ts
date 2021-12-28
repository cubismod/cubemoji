/* eslint-disable no-unused-vars */
// various other classes used by cubemoji
import { Storage } from '@google-cloud/storage'
import dayjs from 'dayjs'
import { Snowflake } from 'discord-api-types'
import { GuildEmoji, SnowflakeUtil } from 'discord.js'
import { unlink } from 'fs'
import { singleton } from 'tsyringe'
import Fuse from 'fuse.js'

// the emoji can come from a few places
// Discord implies that this carries a GuildEmoji object
// Mutant emojis are from here https://mutant.tech/
// URL is typically for custom emotes not in Cubemoji's client that we can parse
// right from a URL
export enum Source {
  Discord,
  Mutant,
  URL,
  Any
}

export interface Image {
  // url as saved in discord cdn
  // or on the web
  url: string,
  // local filename
  localname: string,
}

@singleton()

export class ImageQueue {
  private images: Image[]
  /**
  * Used to keep track of images saved on disk
  * basically we just add another image to the queue
  * and when we hit 30 images, we delete the last one so that we aren't
  * filling the disk.
  * Also used as a caching layer so that we're not consistently downloading
  * the same files over and over again.
  * Queue is stored in reverse in memory.
  * IE front of queue is end of array, end of queue is the front of
  * the array.
  */
  constructor () {
    this.images = []
  }

  /**
   * enqueue a new image and delete
   * an old one if there are more than
   * 40 images being stored right now
   * @param image new image to push in
   */
  async enqueue (image: Image) {
    if (this.images.length >= 40) {
      // delete first item
      const first = this.images.shift()
      if (first) {
        await unlink(first.localname, (err) => {
          if (err) console.error(err)
        })
      }
    }
    this.images.push(image)
  }

  /**
   * returns the first item matching the url
   * if there is an image matching the search
   * or undefined if no image can be found
   * which should lead the caller to download the image and enqueue
   * later on themselves
   * @param url - url from discord or the web we're looking
   * to see is downloaded locally
   */
  async search (url: string) {
    const options = {
      keys: ['url'],
      minMatchCharLength: 3
    }
    const search = new Fuse(this.images, options)
    const res = search.search(url)
    if (res.length > 0) {
      // promote this item to the front of the queue
      // so it stays around for longer and doesnt get deleted
      const i = res[0].refIndex
      this.images.splice(i, 1)
      this.images.push(res[0].item)
      // return the first item
      return res[0].item
    } else return undefined
  }
}

@singleton()
/**
 * gcp storage
 */
export class CubeGCP {
  storage: Storage
  refreshTime: number // unix timestamp to keep track of the next time we should refresh the storage list

  constructor () {
    this.storage = new Storage({ keyFilename: 'serviceKey.json' })
    this.refreshTime = dayjs().unix()
  }
}

// an individual emote
export class Cmoji {
  name: string
  url: string
  source: Source
  guildEmoji: GuildEmoji | null // null if our source isn't Discord
  id: Snowflake // unique ID is generated for emojis missing an ID otherwise it should be copied from the Discord OBJ

  constructor (name: string | null, url: string, source: Source, guildEmoji: GuildEmoji | null = null, id: Snowflake = SnowflakeUtil.generate()) {
    // hate this nonsense of a null name, never seen it in the wild
    if (name != null) this.name = name
    else this.name = '??'
    this.url = url
    this.source = source
    this.guildEmoji = guildEmoji
    // auto generate an ID
    this.id = id
  }
}

export const gotOptions = {
  retry: {
    limit: 2
  },
  timeout: {
    request: 3000
  }
}
