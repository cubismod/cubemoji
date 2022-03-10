/* eslint-disable node/no-path-concat */
import { dirname, importx } from '@discordx/importer'
import { Intents } from 'discord.js'
import { Client } from 'discordx'
import { config } from 'dotenv'
import 'reflect-metadata'
import { bigServerDetect, blockedChannelDetect } from './discord/Guards.js'
import { CubeLogger } from './lib/logger/CubeLogger.js'

// load dotenv file if exists
config()

export class Main {
  private static _client: Client

  static get Client (): Client {
    return this._client
  }

  static async start () {
    const logger = new CubeLogger().main

    await importx(dirname(import.meta.url) + '/discord/**/*.js')
    logger.info('🅲🆄🅱🅴🅼🅾🅹🅸')
    let silent: false|undefined
    if (process.env.CM_ENVIRONMENT === 'prd') {
      logger.info('running in PRD')
    } else {
      logger.info('Running in NPR')
      silent = false
    }

    this._client = new Client({
      botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MEMBERS
      ],
      partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
      // for testing purposes in cubemoji server
      silent: silent,
      guards: [blockedChannelDetect, bigServerDetect]
    })

    if (process.env.CM_TOKEN) await this._client.login(process.env.CM_TOKEN)
    else throw new Error('No token specified with environment variable $CM_TOKEN')
  }
}

await Main.start()
