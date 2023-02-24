// Discord client events
import { ArgsOf, Client, Discord, On, Once } from 'discordx';
import { container } from 'tsyringe';
import { GitClient } from '../../lib/cd/GitClient.js';
import { CubeMessageManager } from '../../lib/cmd/MessageManager.js';
import { Milliseconds } from '../../lib/constants/Units.js';
import { scheduleBackup } from '../../lib/db/DatabaseMgmt.js';
import { CubeStorage, S3Client } from '../../lib/db/Storage.js';
import { EmoteCache } from '../../lib/emote/EmoteCache.js';
import { BadHosts } from '../../lib/http/BadHosts.js';
import { CubeServer } from '../../lib/http/CubeServer.js';
import { PugGenerator } from '../../lib/http/PugGenerator.js';
import { setStatus } from '../../lib/image/DiscordLogic.js';
import { FileQueue } from '../../lib/image/FileQueue.js';
import { WorkerPool } from '../../lib/image/WorkerPool.js';
import { CubeLogger } from '../../lib/observability/CubeLogger.js';
import { InspectorWrapper } from '../../lib/perf/InspectorWrapper.js';

@Discord()
export abstract class ClientEvents {
  private cubeLogger = new CubeLogger();
  private logger = this.cubeLogger.client;

  /**
     * Replies to a user that an error ocurred. Has intelligent
     * handling for determine whether the interaction has been replied
     * to to avoid an error
     * @param interaction
     */
  async reportErrorToUser(interaction: ArgsOf<'interactionCreate'>) {

  }

    /**
     * core setup of the bot including dependency init
     * and command init
     */
    @Once({ event: 'ready' })
  async ready(
    [_args]: ArgsOf<'ready'>, // we don't care about Discord.js's client object
    client: Client
  ) {
    const webServer = new CubeServer();

    // dependency injection initialization

    container.register(CubeLogger, { useValue: this.cubeLogger });
    this.logger.info('registered CubeLogger');

    const sleep = new Promise(resolve => setTimeout(resolve, Milliseconds.fiveSec));
    // setup logging on exceptions, unhandled rejections
    // and sent over http
    process.on('uncaughtException', async (err, origin) => {
      this.cubeLogger.errors.crit(`A fatal error ocurred: ${err}\n Origin: ${origin}.`);
      await sleep;
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      this.cubeLogger.errors.crit(`Fatal unhandled rejection ocurred at: ${promise}, reason: ${reason}.`);
      await sleep;
      process.exit(1);
    });

    container.register(FileQueue, { useValue: new FileQueue() });
    this.logger.info('registered ImageQueue');

    const imageQueue = container.resolve(FileQueue);
    await imageQueue.clear();
    this.logger.info('cleared download directory');

    container.register(CubeMessageManager, { useValue: new CubeMessageManager() });
    this.logger.info('registered CubeMessageManager');

    container.register(CubeStorage, { useValue: new CubeStorage() });
    this.logger.info('registered CubeStorage');

    const badHosts = new BadHosts();
    await badHosts.downloadList();
    container.register(BadHosts, { useValue: badHosts });
    this.logger.info('registered BadHosts');

    setInterval(
      async () => {
        await badHosts.downloadList();
      },
      Milliseconds.week
    );

    await container.resolve(CubeStorage).loadServerOwners(client);

    const s3Client = new S3Client();
    container.register(S3Client, { useValue: s3Client });
    this.logger.info('registered S3Client');

    container.register(InspectorWrapper, { useValue: new InspectorWrapper() });

    // schedule a backup for 2am EST
    await scheduleBackup();

    // load up cubemoji emote cache
    const emoteCache = container.resolve(EmoteCache);
    await emoteCache.init(client);
    emoteCache.loadBlockedEmojis();
    this.logger.info('initialized EmoteCache');

    const pugGenerator = new PugGenerator();
    container.register(PugGenerator, { useValue: pugGenerator });
    await pugGenerator.emojiRender(client.guilds);
    await pugGenerator.staticRenders();
    this.logger.info('initialized PugGenerator');

    let workers = 4;
    if (process.env.CM_WORKERS) workers = parseInt(process.env.CM_WORKERS);
    container.register(WorkerPool, { useValue: new WorkerPool(workers) });
    this.logger.info('registered WorkerPool');

    container.register(CubeServer, { useValue: webServer });

    container.register(GitClient, { useValue: new GitClient() });
    await container.resolve(GitClient).init();
    this.logger.info('registered GitClient');

    // every 90 min, refresh our cache of who the server owners are
    // and re-init permissions on Moderation commands as well as
    // regen pug
    setInterval(
      async () => {
        await container.resolve(CubeStorage).loadServerOwners(client);
        // await client.initApplicationPermissions();
        await container.resolve(PugGenerator).emojiRender(client.guilds);
        this.logger.debug('Pug-regen completed');
        await container.resolve(GitClient).pull();
      },
      Milliseconds.ninetyMin
    );

    await webServer.start();

    try {
      await client.initApplicationCommands();
      // await client.initApplicationPermissions(true);
    } catch (err) {
      this.logger.error('Error initializing application commands and permissions!!!');
      this.logger.error(err);
      throw new Error('exiting application as commands can\'t init properly');
    }

    container.register(Client, { useValue: client });

    this.logger.info(`cubemoji ${process.env.npm_package_version} is now running...`);
    this.logger.info(`It took ${process.uptime()}s to startup this time`);
    this.logger.info(`Access the web server at ${process.env.CM_URL}`);
    // set a new status msg every 5 min
    setStatus(client);
    setInterval(setStatus, Milliseconds.fiveMin, client);

    if (process.env.CM_ENVIRONMENT === 'npr') {
      setInterval(() => {
        const list: string[] = [];
        const memUse = process.memoryUsage();
        for (const key in memUse) {
          list.push(`${key} ${Math.round(memUse[key] / 1024 / 1024 * 100) / 100} MB`);
        }
        this.logger.debug(list.join(' | '));
      }, Milliseconds.thirtySec // 30 sec
      );
    }
  }

    @On({ event: 'warn' })
    warning(
      [data]: ArgsOf<'warn'>
    ) {
      this.logger.debug(data);
    }

    @On({ event: 'debug' })
    debug(
      [data]: ArgsOf<'debug'>
    ) {
      // don't log our own bot token
      if (!data.includes('token')) this.logger.debug(data);
    }

    /**
     * respond to an interaction
     */
    @On({ event: 'interactionCreate' })
    async interactionCreate(
      [interaction]: ArgsOf<'interactionCreate'>,
      client: Client
    ) {
      if (interaction.isButton() || interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith('discordx@pagination@')) {
          return;
        }
      }

      try {
        await client.executeInteraction(interaction);
      } catch (err: unknown) {
        this.logger.error('INTERACTION FAILURE');
        this.logger.error(`Type: ${interaction.type}\nTimestamp: ${Date()}\nGuild: ${interaction.guild}\nUser: ${interaction.user.tag}\nChannel: ${interaction.channel}`);
        this.logger.error(err);
      }
    }

    /**
     * emitted when cubemoji joins a guild
     */
    @On({ event: 'guildCreate' })
    async guildCreate(
      [guild]: ArgsOf<'guildCreate'>,
      client: Client
    ) {
      this.logger.info(`New guild "${guild.id}", "${guild.name}" joined, re-initing app commands & perms`);
      client.botGuilds.push(guild.id);
      await client.initApplicationCommands();
      // await client.initApplicationPermissions();
    }
}
