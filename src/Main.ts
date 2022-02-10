/* eslint-disable node/no-path-concat */
import 'reflect-metadata'
import { Intents, Interaction } from 'discord.js'
import { Client, DIService } from 'discordx'
import secrets from './secrets.json'
import { container } from 'tsyringe'
import { EmoteCache } from './util/EmoteCache'
import { CubeGCP } from './util/Cubemoji'
import { ImageQueue } from './util/ImageQueue'
import { CubeMessageManager } from './util/MessageManager'
import { setStatus } from './util/DiscordLogic'
import { importx } from '@discordx/importer'
import { CubeStorage } from './util/Storage'
import { WorkerPool } from './util/WorkerPool'
export class Main {
  private static _client: Client

  static get Client (): Client {
    return this._client
  }

  static async start () {
    console.log('🅲🆄🅱🅴🅼🅾🅹🅸')
    DIService.container = container
    if (secrets.environment === 'prd') {
      console.log('running in PRD')
      this._client = new Client({
        botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],
        intents: [
          Intents.FLAGS.GUILDS,
          Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
          Intents.FLAGS.GUILD_MESSAGES,
          Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
          Intents.FLAGS.GUILD_MEMBERS,
          Intents.FLAGS.GUILD_PRESENCES
        ],
        partials: ['MESSAGE', 'CHANNEL', 'REACTION']
      })
    } else {
      console.log('Running in NPR')
      this._client = new Client({
        botGuilds: [secrets.testGuild],
        intents: [
          Intents.FLAGS.GUILDS,
          Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
          Intents.FLAGS.GUILD_MESSAGES,
          Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
          Intents.FLAGS.GUILD_MEMBERS,
          Intents.FLAGS.GUILD_PRESENCES
        ],
        partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
        // for testing purposes in cubemoji server
        silent: false
      })
    }
    await importx(__dirname + '/**/*.{ts,js}')
    console.log()
    await this._client.login(secrets.token)

    this._client.once('ready', async () => {
      // dependency injection initialization
      if (DIService.container !== undefined) {
        DIService.container.register(ImageQueue, { useValue: new ImageQueue() })
        console.log('registered ImageQueue')

        DIService.container.register(CubeMessageManager, { useValue: new CubeMessageManager() })
        console.log('registered CubeMessageManager')

        DIService.container.register(CubeStorage, { useValue: new CubeStorage() })
        console.log('registered CubeStorage')
        await container.resolve(CubeStorage).initHosts()
        console.log('initialized hosts list')

        DIService.container.register(CubeGCP, { useValue: new CubeGCP() })
        console.log('registered CubeGCP')

        DIService.container.register(WorkerPool, { useValue: new WorkerPool(secrets.workers) })
        console.log('registered WorkerPool')

        DIService.container.register(EmoteCache, { useValue: new EmoteCache(this._client) })
        console.log('registered EmoteCache')
        // load up cubemoji emote cache
        const emoteCache = container.resolve(EmoteCache)
        await emoteCache.init()
        console.log('initialized EmoteCache')
      } else {
        throw new Error('DIServer.container is undefined therefore cannot initialize dependency injection')
      }

      await this._client.initApplicationCommands()
      await this._client.initApplicationPermissions()

      console.log(`cubemoji ${secrets.version} is now running...`)
      // set a new status msg every 5 min
      setStatus(this._client)
      setInterval(setStatus, 300000, this._client)
    })

    this._client.on('interactionCreate', async (interaction: Interaction) => {
      // we limit the test bot to only interacting in my own #bot-test channel
      // while prd can interact with any channel
      if (!interaction.channel ||
        (secrets.environment === 'prd' && interaction.channel.id !== secrets.testChannel) ||
        (secrets.environment === 'npr' && interaction.channel.id === secrets.testChannel)) {
        if (interaction.isButton() || interaction.isSelectMenu()) {
          if (interaction.customId.startsWith('discordx@pagination@')) {
            return
          }
        }
        try {
          await this._client.executeInteraction(interaction)
        } catch (err: unknown) {
          console.error('INTERACTION FAILURE')
          console.error(`Type: ${interaction.type}\nTimestamp: ${Date()}\nGuild: ${interaction.guild}\nUser: ${interaction.user.tag}\nChannel: ${interaction.channel}`)
          console.error(err)
        }
      }
    })
  }
}

Main.start()
