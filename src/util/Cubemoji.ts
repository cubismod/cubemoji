/* eslint-disable no-unused-vars */
import { Storage } from '@google-cloud/storage'
import dayjs from 'dayjs'
import { Snowflake } from 'discord-api-types'
import { GuildEmoji, SnowflakeUtil } from 'discord.js'
import { unlink } from 'fs'
import { singleton } from 'tsyringe'

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

@singleton()
// used to keep track of images saved on disk
// basically we just add another image to the queue
// and when we hit 20 images, we delete the last one so that we aren't
// filling the disk
export class ImageQueue {
  private images: string[]
  constructor () {
    this.images = []
  }

  async enqueue (image: string) {
    if (this.images.length > 19) {
      // delete first item
      const first = this.images.shift()
      if (first) {
        await unlink(first, (err) => {
          if (err) console.error(err)
        })
      }
    }
    this.images.push(image)
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
