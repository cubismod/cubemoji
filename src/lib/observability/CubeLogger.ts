import { singleton } from 'tsyringe';
import { createLogger, format, Logger, transports } from 'winston';
import { Bytes } from '../constants/Units.js';
import { LokiTransport } from './LokiTransport.js';

/**
 * cubemoji logging using Winston
 * https://www.npmjs.com/package/winston
 */
@singleton()
export class CubeLogger {
  readonly parent: Logger;
  // each child is its own logger
  readonly main: Logger;
  readonly command: Logger;
  readonly autocomplete: Logger;
  readonly discordLogic: Logger;
  readonly emoteCache: Logger;
  readonly imageQueue: Logger;
  readonly storage: Logger;
  readonly workerPool: Logger;
  readonly imageLogic: Logger;
  readonly messageManager: Logger;
  readonly events: Logger;
  readonly databaseMgmt: Logger;
  readonly client: Logger;
  readonly web: Logger;
  readonly errors: Logger;
  readonly git: Logger;
  readonly inspector: Logger;
  readonly traces: Logger;

  constructor() {
    const lokiTransport = new LokiTransport({
      host: process.env.CM_HTTP_HOST ?? 'localhost',
      port: parseInt(process.env.CM_HTTP_PORT ?? '200'),
      label: 'cubemoji'
    });

    // different transports when using different versions of bot
    if (process.env.CM_ENVIRONMENT === 'npr') {
      // in NPR we do more verbose logging and also log to a file
      this.parent = createLogger({
        level: 'debug',
        format: format.combine(
          format.timestamp(),
          format.errors({ stack: true }),
          format.colorize({ all: true }),
          format.simple()
        ),
        transports: [
          new transports.File({
            filename: 'data/logs/npr/cubemoji.log',
            maxsize: Bytes.oneMB * 10,
            tailable: true,
            format: format.combine(
              format.uncolorize(),
              format.json()
            )
          })
        ]
      });
      // only log to file during testing
      if (!process.env.CM_TEST) this.parent.add(new transports.Console());
    } else {
      // PRD logging
      /**
         * Grafana Loki logging process
         * send log file over syslog to Promtail
         * instance which then will upload files to
         * Grafana cloud. This is done with HTTP.
         */
      this.parent = createLogger({
        level: 'info',
        format: format.combine(
          format.timestamp(),
          format.errors({ stack: true }),
          format.json()
        ),
        transports: [
          new transports.Console({})
          /* new transports.File({
            filename: 'data/logs/prd/cubemoji.log',
            maxsize: Bytes.oneMB,
            maxFiles: 20,
          }) */
        ]
      });
      if (process.env.CM_HTTP_LOG === 'true' &&
        process.env.CM_HTTP_PORT &&
        process.env.CM_HTTP_HOST) {
        this.parent.add(lokiTransport);
      }
    }

    // now setup child loggers
    this.main = this.parent.child({ module: 'Main' });
    this.command = this.parent.child({ module: 'Command' });
    this.autocomplete = this.parent.child({ module: 'Autocomplete' });
    this.discordLogic = this.parent.child({ module: 'DiscordLogic' });
    this.emoteCache = this.parent.child({ module: 'EmoteCache' });
    this.imageQueue = this.parent.child({ module: 'ImageQueue' });
    this.storage = this.parent.child({ module: 'Storage' });
    this.workerPool = this.parent.child({ module: 'WorkerPool' });
    this.imageLogic = this.parent.child({ module: 'ImageLogic' });
    this.messageManager = this.parent.child({ module: 'MessageManager' });
    this.events = this.parent.child({ module: 'Events' });
    this.databaseMgmt = this.parent.child({ module: 'DatabaseManagement' });
    this.client = this.parent.child({ module: 'Client' });
    this.web = this.parent.child({ module: 'Web' });
    this.errors = this.parent.child({ module: 'Errors' });
    this.git = this.parent.child({ module: 'Git' });
    this.inspector = this.parent.child({ module: 'InspectorWrapper' });
    this.traces = this.parent.child({ module: 'Traces' });

    /* // exceptions/rejections log to separate file
    const exReFileTransport = new transports.File({
      filename: 'data/logs/exceptions.log',
      maxsize: Bytes.oneMB,
      maxFiles: 20
    })

    const exReConsoleTransport = new transports.Console()

    const exReLogger = createLogger({
      exceptionHandlers: [
        exReFileTransport, exReConsoleTransport
      ],
      rejectionHandlers: [
        exReFileTransport, exReConsoleTransport
      ]
    })

    if (process.env.CM_HTTP_LOG === 'true' &&
    process.env.CM_HTTP_PORT &&
    process.env.CM_HTTP_HOST) {
      exReLogger.exceptions.handle(lokiTransport)
      exReLogger.rejections.handle(lokiTransport)
    }

    // handle exceptions and errors with logger */
  }
}
