import { dirname, importx } from '@discordx/importer';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK, tracing } from '@opentelemetry/sdk-node';
import { BasicTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
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

export class Main {
  private static _client: Client;

  static get Client(): Client {
    return this._client;
  }

  static trace () {
    if (process.env.CM_ENABLE_TRACING === 'true') {
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

      const sdk = new NodeSDK({
        traceExporter: new tracing.ConsoleSpanExporter(),
        instrumentations: [getNodeAutoInstrumentations()]
      });

      if (process.env.CM_TRACE_PASSWORD) {
        const buffer = Buffer.from(process.env.CM_TRACE_PASSWORD);
        const password = buffer.toString('base64');

        const provider = new BasicTracerProvider();
        const exporter = new OTLPTraceExporter({
          url: process.env.CM_TRACE_URL,
          headers: {
            Authorization: `${process.env.CM_TRACE_USER} ${password}`
          }
        });

        provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
          maxQueueSize: 2000,
          scheduledDelayMillis: 30000
        }));

        provider.register();

        sdk.start();

        return true;
      }
    }
  }

  static async start() {
    const logger = new CubeLogger().main;

    const tracing = this.trace();

    if (tracing) {
      logger.info('Tracing enabled');
    }
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
