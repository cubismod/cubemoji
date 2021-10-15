/* eslint-disable no-unused-vars */
import { Snowflake } from 'discord-api-types'
import { GuildEmoji, SnowflakeUtil } from 'discord.js'

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
