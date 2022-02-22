// Discord client events

import { ArgsOf, Client, Discord, DIService, On, Once } from 'discordx'
import { container } from 'tsyringe'
import { CubeMessageManager } from '../../lib/cmd/MessageManager'
import { scheduleBackup } from '../../lib/db/DatabaseMgmt'
import { CubeStorage } from '../../lib/db/Storage'
import { EmoteCache } from '../../lib/emote/EmoteCache'
import { setStatus } from '../../lib/image/DiscordLogic'
import { ImageQueue } from '../../lib/image/ImageQueue'
import { WorkerPool } from '../../lib/image/WorkerPool'
import { logManager } from '../../lib/LogManager'

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
        // every 30 min, refresh our cache of who the server owners are
        // and re-init permissions on Moderation commands
        setInterval(
          async () => {
            await container.resolve(CubeStorage).loadServerOwners(client)
            await client.initApplicationPermissions()
            logger.debug('permission sync completed')
          },
          1.8e+6 // 30 min
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
        await client.initApplicationPermissions(true)
      } catch (err) {
        logger.error('Error initializing application commands and permissions!!!')
        logger.error(err)
        throw new Error('exiting application as commands can\'t init properly')
      }

      logger.info(`cubemoji ${process.env.CM_VERSION} is now running...`)
      logger.info(`It took ${process.uptime()}s to startup this time`)
      // set a new status msg every 5 min
      setStatus(client)
      setInterval(setStatus, 300000, client)

      if (process.env.CM_ENVIRONMENT === 'npr') {
        setInterval(() => {
          const list: string[] = []
          const memUse = process.memoryUsage()
          for (const key in memUse) {
            list.push(`${key} ${Math.round(memUse[key] / 1024 / 1024 * 100) / 100} MB`)
          }
          logger.debug(list.join(' | '))
        },
        30000 // 30 sec
        )
      }
    }
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

  /**
   * emitted when cubemoji joins a guild
   */
  @On('guildCreate')
  async guildCreate (
    [guild]: ArgsOf<'guildCreate'>,
    client: Client
  ) {
    logger.info(`New guild "${guild.id}", "${guild.name}" joined, re-initing app commands & perms`)
    client.botGuilds.push(guild.id)
    await client.initApplicationCommands()
    await client.initApplicationPermissions()
  }
}
