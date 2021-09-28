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

    constructor (name: string | null, url: string, source: Source, guildEmoji: Discord.GuildEmoji | null = null) {
      // hate this nonsense of a null name, never seen it in the wild
      if (name != null) this.name = name
      else this.name = '??'
      this.url = url
      this.source = source
      this.guildEmoji = guildEmoji
    }
}
