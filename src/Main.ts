/* eslint-disable node/no-path-concat */
import { dirname, importx } from '@discordx/importer'
import { Intents, Interaction } from 'discord.js'
import { Client, DIService } from 'discordx'
import 'reflect-metadata'
import { container } from 'tsyringe'
import secrets from './res/secrets.json'
import { CubeGCP } from './util/Cubemoji'
import { scheduleBackup } from './util/DatabaseMgmt'
import { setStatus } from './util/DiscordLogic'
import { EmoteCache } from './util/EmoteCache'
import { ImageQueue } from './util/ImageQueue'
import { logManager } from './util/LogManager'
import { CubeMessageManager } from './util/MessageManager'
import { CubeStorage } from './util/Storage'
import { WorkerPool } from './util/WorkerPool'

const logger = logManager().getLogger('Main')

export class Main {
  private static _client: Client

  static get Client (): Client {
    return this._client
  }

  static async start () {
    await importx(dirname(import.meta.url) + '/**/*.{js}')
    logger.info('🅲🆄🅱🅴🅼🅾🅹🅸')
    DIService.container = container
    let silent: false|undefined
    if (secrets.environment === 'prd') {
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
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_PRESENCES
      ],
      partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
      // for testing purposes in cubemoji server
      silent: silent
    })
    await Main._client.login(secrets.token)

    this._client.once('ready', async () => {
      await this._client.guilds.fetch()
      // dependency injection initialization
      if (DIService.container !== undefined) {
        DIService.container.register(ImageQueue, { useValue: new ImageQueue() })
        logger.info('registered ImageQueue')

        const imageQueue = container.resolve(ImageQueue)
        await imageQueue.clear()
        logger.info('cleared download directory')

        DIService.container.register(CubeMessageManager, { useValue: new CubeMessageManager() })
        logger.info('registered CubeMessageManager')

        DIService.container.register(CubeStorage, { useValue: new CubeStorage() })
        logger.info('registered CubeStorage')
        await container.resolve(CubeStorage).initHosts()
        setInterval(
          async () => {
            await container.resolve(CubeStorage).initHosts()
          },
          6.048e+8 // 1 week interval
        )

        await container.resolve(CubeStorage).loadServerOwners(this._client)
        setInterval(
          async () => {
            await container.resolve(CubeStorage).loadServerOwners(this._client)
          },
          3.6e+6 // 1 hour
        )

        // schedule a backup for 3am EST
        scheduleBackup()

        DIService.container.register(CubeGCP, { useValue: new CubeGCP() })
        logger.info('registered CubeGCP')

        DIService.container.register(WorkerPool, { useValue: new WorkerPool(secrets.workers) })
        logger.info('registered WorkerPool')

        DIService.container.register(EmoteCache, { useValue: new EmoteCache() })
        logger.info('registered EmoteCache')
        // load up cubemoji emote cache
        const emoteCache = container.resolve(EmoteCache)
        await emoteCache.init(this._client)
        emoteCache.loadBlockedEmojis()
        logger.info('initialized EmoteCache')
      } else {
        throw new Error('DIServer.container is undefined therefore cannot initialize dependency injection')
      }

      await this._client.initApplicationCommands({
        global: { log: true },
        guild: { log: true }
      })
      await this._client.initApplicationPermissions()

      logger.info(`cubemoji ${secrets.version} is now running...`)
      // set a new status msg every 5 min
      setStatus(this._client)
      setInterval(setStatus, 300000, this._client)
    })

    this._client.on('interactionCreate', async (interaction: Interaction) => {
      // we limit the test bot to only interacting in my own #bot-test channel
      // while prd can interact with any channel
      if (interaction.isButton() || interaction.isSelectMenu()) {
        if (interaction.customId.startsWith('discordx@pagination@')) {
          return
        }
      }
      try {
        await this._client.executeInteraction(interaction)
      } catch (err: unknown) {
        logger.error('INTERACTION FAILURE')
        logger.error(`Type: ${interaction.type}\nTimestamp: ${Date()}\nGuild: ${interaction.guild}\nUser: ${interaction.user.tag}\nChannel: ${interaction.channel}`)
        logger.error(err)
      }
    })
  }
}

await Main.start()
