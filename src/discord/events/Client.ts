// Discord client events

import { ArgsOf, Client, Discord, DIService, On, Once } from 'discordx'
import { container } from 'tsyringe'
import { CubeMessageManager } from '../../lib/cmd/MessageManager.js'
import { Milliseconds } from '../../lib/constants/Units.js'
import { scheduleBackup } from '../../lib/db/DatabaseMgmt.js'
import { CubeStorage } from '../../lib/db/Storage.js'
import { EmoteCache } from '../../lib/emote/EmoteCache.js'
import { setupHTTP } from '../../lib/http/HTTPServe.js'
import { PugGenerator } from '../../lib/http/PugGenerator.js'
import { setStatus } from '../../lib/image/DiscordLogic.js'
import { ImageQueue } from '../../lib/image/ImageQueue.js'
import { WorkerPool } from '../../lib/image/WorkerPool.js'
import { CubeLogger } from '../../lib/logger/CubeLogger.js'

@Discord()
export abstract class ClientEvents {
  private cubeLogger = new CubeLogger()
  private logger = this.cubeLogger.client
  /**
   * core setup of the bot including dependency init
   * and command init
   */
  @Once('ready')
  async ready (
    [_args]: ArgsOf<'ready'>, // we don't care about Discord.js's client object
    client: Client
  ) {
    DIService.container = container
    // dependency injection initialization
    if (DIService.container !== undefined) {
      DIService.container.register(CubeLogger, { useValue: this.cubeLogger })
      this.logger.info('registered CubeLogger')

      DIService.container.register(ImageQueue, { useValue: new ImageQueue() })
      this.logger.info('registered ImageQueue')

      const imageQueue = container.resolve(ImageQueue)
      await imageQueue.clear()
      this.logger.info('cleared download directory')

      DIService.container.register(CubeMessageManager, { useValue: new CubeMessageManager() })
      this.logger.info('registered CubeMessageManager')

      DIService.container.register(CubeStorage, { useValue: new CubeStorage() })
      this.logger.info('registered CubeStorage')
      await container.resolve(CubeStorage).initHosts()
      setInterval(
        async () => {
          await container.resolve(CubeStorage).initHosts()
        },
        Milliseconds.week
      )

      await container.resolve(CubeStorage).loadServerOwners(client)

      // schedule a backup for 2am EST
      scheduleBackup()

      // load up cubemoji emote cache
      const emoteCache = container.resolve(EmoteCache)
      await emoteCache.init(client)
      emoteCache.loadBlockedEmojis()
      this.logger.info('initialized EmoteCache')

      DIService.container.register(PugGenerator, { useValue: new PugGenerator() })
      await container.resolve(PugGenerator).render(client.guilds)
      this.logger.info('initialized PugGenerator')

      let workers = 4
      if (process.env.CM_WORKERS) workers = parseInt(process.env.CM_WORKERS)
      DIService.container.register(WorkerPool, { useValue: new WorkerPool(workers) })
      this.logger.info('registered WorkerPool')

      client.guilds.cache

      // every 30 min, refresh our cache of who the server owners are
      // and re-init permissions on Moderation commands as well as
      // regen pug
      setInterval(
        async () => {
          await container.resolve(CubeStorage).loadServerOwners(client)
          await client.initApplicationPermissions()
          await container.resolve(PugGenerator).render(client.guilds)
          this.logger.debug('permission sync & pug-regen completed')
        },
        Milliseconds.thirtyMin
      )
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
      this.logger.error('Error initializing application commands and permissions!!!')
      this.logger.error(err)
      throw new Error('exiting application as commands can\'t init properly')
    }

    // setup healthcheck listener for fly
    setupHTTP()

    this.logger.info(`cubemoji ${process.env.npm_package_version} is now running...`)
    this.logger.info(`It took ${process.uptime()}s to startup this time`)
    // set a new status msg every 5 min
    setStatus(client)
    setInterval(setStatus, Milliseconds.fiveMin, client)

    if (process.env.CM_ENVIRONMENT === 'npr') {
      setInterval(() => {
        const list: string[] = []
        const memUse = process.memoryUsage()
        for (const key in memUse) {
          list.push(`${key} ${Math.round(memUse[key] / 1024 / 1024 * 100) / 100} MB`)
        }
        this.logger.debug(list.join(' | '))
      },
      Milliseconds.thirtySec // 30 sec
      )
    }
  }

  @On('warn')
  warning (
    [data]: ArgsOf<'warn'>
  ) {
    this.logger.debug(data)
  }

  @On('debug')
  debug (
    [data]: ArgsOf<'debug'>
  ) {
    // don't log our own bot token
    if (!data.includes('token')) this.logger.debug(data)
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
      this.logger.error('INTERACTION FAILURE')
      this.logger.error(`Type: ${interaction.type}\nTimestamp: ${Date()}\nGuild: ${interaction.guild}\nUser: ${interaction.user.tag}\nChannel: ${interaction.channel}`)
      this.logger.error(err)
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
    this.logger.info(`New guild "${guild.id}", "${guild.name}" joined, re-initing app commands & perms`)
    client.botGuilds.push(guild.id)
    await client.initApplicationCommands()
    await client.initApplicationPermissions()
  }
}
