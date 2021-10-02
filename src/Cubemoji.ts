/* eslint-disable no-unused-vars */
import { EmoteCache } from './EmoteCache'
import workerpool = require('workerpool')
import fbadmin = require('firebase-admin')
import Discord = require('discord.js')
import { Client } from 'discordx'

// the emoji can come from a few places
// Discord implies that this carries a GuildEmoji object
// Mutant emojis are from here https://mutant.tech/
// URL is typically for custom emotes not in Cubemoji's client that we can parse
// right from a URL
export enum Source {
  Discord,
  Mutant,
  URL
}

// effects used in an edit operation
export enum Effects {
  Blur,
  Charcoal,
  Cycle,
  Edge,
  Emboss,
  Enhance,
  Equalize,
  Flip,
  Flop,
  Implode,
  Magnify,
  Median,
  Minify,
  Monochrome,
  Mosaic,
  Motionblur,
  Noise,
  Normalize,
  Paint,
  Roll,
  Rotate,
  Sepia,
  Shave,
  Sharpen,
  Solarize,
  Spread,
  Swirl,
  Threshold,
  Trim,
  Wave
}
// a class that we can pass around and carry useful objects on
export class Companion {
  cache: EmoteCache // custom emote cache that extends what just the discord client offers
  pool: workerpool.WorkerPool // workers used for jimp actions
  rescaleMsgs: Map<Discord.Snowflake, Discord.Snowflake>

  // start up a fresh companion
  constructor (client: Client) {
    this.cache = new EmoteCache(client)
    this.pool = workerpool.pool()
    this.rescaleMsgs = new Map<Discord.Snowflake, Discord.Snowflake>()
  }
}

// an individual emote
export class Cmoji {
    name: string
    url: string
    source: Source
    guildEmoji: Discord.GuildEmoji | null // null if our source isn't Discord
    id: Discord.Snowflake // unique ID is generated for emojis missing an ID otherwise it should be copied from the Discord OBJ

    constructor (name: string | null, url: string, source: Source, guildEmoji: Discord.GuildEmoji | null = null, id: Discord.Snowflake = Discord.SnowflakeUtil.generate()) {
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
