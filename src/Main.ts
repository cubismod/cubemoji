import { dirname, importx } from '@discordx/importer';
import * as Sentry from '@sentry/node';
import '@sentry/tracing';
import { Intents } from 'discord.js';
import { Client } from 'discordx';
import { config } from 'dotenv';
import { mkdir } from 'fs/promises';
import 'reflect-metadata';
import { bigServerDetect, blockedChannelDetect } from './discord/Guards.js';
import { CubeLogger } from './lib/logger/CubeLogger.js';

// load dotenv file if exists
config();

// create a directory and ignore if already exists
async function createDir(dirName: string) {
  try {
    await mkdir(dirName, { recursive: true });
  } catch { }
}

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace NodeJS {
    // eslint-disable-next-line no-unused-vars
    interface Global {
      __rootdir__: string;
    }
  }
}

global.__rootdir__ = process.cwd();

export class Main {
  private static _client: Client;

  static get Client(): Client {
    return this._client;
  }

  static async start() {
    // create required folders
    await createDir('./download');
    await createDir('./data');
    await createDir('./data/logs');
    await createDir('./static/list');
    await createDir('./static/emotes');

    // tracing setup
    if (process.env.CM_TRACING === 'true' && process.env.CM_DSN) {
      let debug = false;
      if (process.env.CM_ENVIRONMENT === 'npr') debug = true;
      Sentry.init({
        dsn: process.env.CM_DSN,
        environment: process.env.CM_ENVIRONMENT,
        release: process.env.npm_package_version,
        tracesSampleRate: 0.7,
        debug
      });
    }

    const logger = new CubeLogger().main;

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
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MEMBERS
      ],
      partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
      // for testing purposes in cubemoji server
      silent,
      guards: [blockedChannelDetect, bigServerDetect]
    });

    if (process.env.CM_TOKEN) await this._client.login(process.env.CM_TOKEN);
    else throw new Error('No token specified with environment variable $CM_TOKEN');
  }
}

await Main.start();
