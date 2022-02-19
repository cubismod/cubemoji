/* eslint-disable node/no-path-concat */
import { dirname, importx } from '@discordx/importer'
import { Intents, Interaction, RateLimitData } from 'discord.js'
import { Client, DIService } from 'discordx'
import { config } from 'dotenv'
import 'reflect-metadata'
import { container } from 'tsyringe'
import { scheduleBackup } from './util/DatabaseMgmt'
import { setStatus } from './util/DiscordLogic'
import { EmoteCache } from './util/EmoteCache'
import { ImageQueue } from './util/ImageQueue'
import { logManager } from './util/LogManager'
import { CubeMessageManager } from './util/MessageManager'
import { CubeStorage } from './util/Storage'
import { WorkerPool } from './util/WorkerPool'

// load dotenv file if exists
config()

const logger = logManager().getLogger('Main')
const clientLogger = logManager().getLogger('Client')

export class Main {
  private static _client: Client

  static get Client (): Client {
    return this._client
  }

  static async start () {
    await importx(dirname(import.meta.url) + '/discord/**/*.js')
    logger.info('🅲🆄🅱🅴🅼🅾🅹🅸')
    DIService.container = container
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
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_PRESENCES
      ],
      partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
      // for testing purposes in cubemoji server
      silent: silent
    })
    if (process.env.CM_TOKEN) await this._client.login(process.env.CM_TOKEN)
    else throw new Error('No token specified with environment variable $CM_TOKEN')

    this._client.on('rateLimit', async (data: RateLimitData) => {
      logger.debug('Rate Limit Error!')
      logger.debug(data)
    })

    this._client.on('warn', async (msg: string) => {
      logger.warn(msg)
    })

    this._client.on('debug', async (message: string) => {
      logger.debug(message)
    })

    this._client.once('ready', async () => {
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

        // schedule a backup for 2am EST
        scheduleBackup()

        let workers = 4
        if (process.env.CM_WORKERS) workers = parseInt(process.env.CM_WORKERS)
        DIService.container.register(WorkerPool, { useValue: new WorkerPool(workers) })
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

      try {
        await this._client.initApplicationCommands({
          global: { log: true },
          guild: { log: true }
        })
        await this._client.initApplicationPermissions()
      } catch (err) {
        clientLogger.error('Error initializing application commands and permissions!!!')
        clientLogger.error(err)
        throw new Error('exiting application as commands can\'t init properly')
      }

      logger.info(`cubemoji ${process.env.CM_VERSION} is now running...`)
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
