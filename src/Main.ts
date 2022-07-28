import { dirname, importx } from '@discordx/importer';
import { GatewayIntentBits, Partials } from 'discord.js';
import { Client, DIService, tsyringeDependencyRegistryEngine } from 'discordx';
import { config } from 'dotenv';
import { mkdir } from 'fs/promises';
import 'reflect-metadata';
import { container } from 'tsyringe';
import { bigServerDetect, blockedChannelDetect } from './discord/Guards.js';
import { CubeLogger } from './lib/observability/CubeLogger.js';

// load dotenv file if exists
config();

// create a directory and ignore if already exists
async function createDir(dirName: string) {
  try {
    await mkdir(dirName, { recursive: true });
  } catch { }
}

export class Main {
  private static _client: Client;

  static get Client(): Client {
    return this._client;
  }

  static async start() {
    DIService.engine = tsyringeDependencyRegistryEngine.setInjector(container);

    const logger = new CubeLogger().main;

    // create required folders
    await createDir('./download');
    await createDir('./data');
    await createDir('./data/logs');
    await createDir('./static/list');
    await createDir('./static/emotes');
    await createDir('./data/backups');

    await importx(dirname(import.meta.url) + '/discord/**/*.js');
    logger.info('🅲🆄🅱🅴🅼🅾🅹🅸');
    logger.info(`v. ${process.env.npm_package_version}`);
    let silent: false | undefined;
    if (process.env.CM_ENVIRONMENT === 'prd') {
      logger.info('running in PRD');
    } else {
      logger.info('Running in NPR');
      silent = false;
    }

    this._client = new Client({
      botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
      // for testing purposes in cubemoji server
      silent,
      guards: [blockedChannelDetect, bigServerDetect]
    });

    if (process.env.CM_TOKEN) await this._client.login(process.env.CM_TOKEN);
    else throw new Error('No token specified with environment variable $CM_TOKEN');
  }
}

await Main.start();
