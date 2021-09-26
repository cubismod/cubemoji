/* eslint-disable node/no-path-concat */
import 'reflect-metadata'
import { Intents } from 'discord.js'
import { Client } from 'discordx'
import secrets from '../secrets.json'
import pkginfo from '../package.json'
import { Companion } from './Cubemoji'

var cubem

export class Main {
  private static _client: Client

  static get Client (): Client {
    return this._client
  }

  static async start () {
    this._client = new Client({
      botGuilds: ['545784892492087303'],
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
      ],
      classes: [
        `${__dirname}/discords/*Discord.ts`, // glob string to load the classes
        `${__dirname}/discords/*Discord.js` // If you compile using "tsc" the file extension change to .js
      ],
      // for testing purposes in cubemoji server
      silent: false

    })
    await this._client.login(secrets.token)

    this._client.once('ready', async () => {
      await this._client.initApplicationCommands()
      // now we need to load up our global var
      globalThis.companion = new Companion(this.Client)
      // let the client actually load the emotes in now
      await global.companion.cache.init()

      console.log(`cubemoji ${pkginfo.version} is now running...`)
    })

    this._client.on('interaction', (interaction) => {
      this._client.executeInteraction(interaction)
    })
  }
}

Main.start()
