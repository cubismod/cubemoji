/* eslint-disable node/no-path-concat */
import 'reflect-metadata'
import { Intents } from 'discord.js'
import { Client, DIService } from 'discordx'
import secrets from '../secrets.json'
import pkginfo from '../package.json'
import { container } from 'tsyringe'
import { EmoteCache } from './EmoteCache'
import { ImageQueue } from './Cubemoji'
export class Main {
  private static _client: Client

  static get Client (): Client {
    return this._client
  }

  static async start () {
    DIService.container = container
    this._client = new Client({
      botGuilds: ['545784892492087303'],
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_PRESENCES
      ],
      classes: [
        `${__dirname}/**/*.{js,ts}` // glob string to load the classes
      ],
      // for testing purposes in cubemoji server
      silent: false

    })
    await this._client.login(secrets.token)

    this._client.once('ready', async () => {
      if (DIService.container !== undefined) {
        DIService.container.register('Client', { useValue: this._client })
        DIService.container.register(ImageQueue, { useValue: new ImageQueue() })
        console.log('initializing emotes')
        // load up cubemoji emote cache
        const companion = container.resolve(EmoteCache)
        await companion.init()
      }

      await this._client.initApplicationCommands()
      await this._client.initApplicationPermissions()

      console.log(`cubemoji ${pkginfo.version} is now running...`)
    })

    this._client.on('interaction', (interaction) => {
      if (interaction.isButton() || interaction.isSelectMenu()) {
        if (interaction.customId.startsWith('discordx@pagination@')) {
          return
        }
      }
      this._client.executeInteraction(interaction)
    })
  }
}

Main.start()
