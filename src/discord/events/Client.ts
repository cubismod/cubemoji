// Discord client events

import { ArgsOf, Client, Discord, DIService, On, Once } from 'discordx'
import { container } from 'tsyringe'
import { scheduleBackup } from '../../util/DatabaseMgmt'
import { setStatus } from '../../util/DiscordLogic'
import { EmoteCache } from '../../util/EmoteCache'
import { ImageQueue } from '../../util/ImageQueue'
import { logManager } from '../../util/LogManager'
import { CubeMessageManager } from '../../util/MessageManager'
import { CubeStorage } from '../../util/Storage'
import { WorkerPool } from '../../util/WorkerPool'

const logger = logManager().getLogger('Client')

@Discord()
export abstract class ClientEvents {
  /**
   * core setup of the bot including dependency init
   * and command init
   */
  @Once('ready')
  async ready (
    [_args]: ArgsOf<'ready'>, // we don't care about Discord.js's client object
    client: Client
  ) {
    logger.info('Gateway ready.')
    DIService.container = container
    if (DIService.container !== undefined) {
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

        await container.resolve(CubeStorage).loadServerOwners(client)
        setInterval(
          async () => {
            await container.resolve(CubeStorage).loadServerOwners(client)
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
        await emoteCache.init(client)
        emoteCache.loadBlockedEmojis()
        logger.info('initialized EmoteCache')
      } else {
        throw new Error('DIServer.container is undefined therefore cannot initialize dependency injection')
      }

      try {
        await client.initApplicationCommands({
          global: { log: true },
          guild: { log: true }
        })
        await client.initApplicationPermissions()
      } catch (err) {
        logger.error('Error initializing application commands and permissions!!!')
        logger.error(err)
        throw new Error('exiting application as commands can\'t init properly')
      }

      logger.info(`cubemoji ${process.env.CM_VERSION} is now running...`)
      // set a new status msg every 5 min
      setStatus(client)
      setInterval(setStatus, 300000, client)
    }
  }

  @On('rateLimit')
  rateLimit (
    [data]: ArgsOf<'rateLimit'>
  ) {
    logger.debug(data)
  }

  @On('warn')
  warning (
    [data]: ArgsOf<'warn'>
  ) {
    logger.debug(data)
  }

  @On('debug')
  debug (
    [data]: ArgsOf<'debug'>
  ) {
    // don't log our own bot token
    if (!data.includes('token')) logger.debug(data)
  }

  /**
   * respond to an interaction
   */
  @On('interactionCreate')
  async interactionCreate (
    [interaction]: ArgsOf<'interactionCreate'>,
    client: Client
  ) {
    if (interaction.isButton() || interaction.isSelectMenu()) {
      if (interaction.customId.startsWith('discordx@pagination@')) {
        return
      }
    }
    try {
      await client.executeInteraction(interaction)
    } catch (err: unknown) {
      logger.error('INTERACTION FAILURE')
      logger.error(`Type: ${interaction.type}\nTimestamp: ${Date()}\nGuild: ${interaction.guild}\nUser: ${interaction.user.tag}\nChannel: ${interaction.channel}`)
      logger.error(err)
    }
  }
}
