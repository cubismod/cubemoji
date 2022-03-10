import { singleton } from 'tsyringe'
import { createLogger, format, Logger, transports } from 'winston'
import { Bytes } from '../constants/Units.js'
import { LokiTransport } from './LokiTransport.js'

/**
 * cubemoji logging using Winston
 * https://www.npmjs.com/package/winston
 */
@singleton()
export class CubeLogger {
  readonly parent: Logger
  // each child is its own logger
  readonly main: Logger
  readonly command: Logger
  readonly autocomplete: Logger
  readonly discordLogic: Logger
  readonly emoteCache: Logger
  readonly imageQueue: Logger
  readonly storage: Logger
  readonly workerPool: Logger
  readonly imageLogic: Logger
  readonly messageManager: Logger
  readonly events: Logger
  readonly databaseMgmt: Logger
  readonly client: Logger
  readonly web: Logger

  constructor () {
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
          new transports.Console(),
          new transports.File({
            filename: 'data/logs/npr/cubemoji.log',
            maxsize: Bytes.oneMB,
            maxFiles: 4,
            zippedArchive: true,
            format: format.combine(
              format.uncolorize(),
              format.json()
            )
          })
        ]
      })
    } else {
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
          new transports.Console(),
          new transports.File({
            filename: 'data/logs/prd/cubemoji.log',
            maxsize: Bytes.oneMB,
            maxFiles: 10,
            zippedArchive: true
          })
        ]
      })
      if (process.env.CM_HTTP_LOG === 'true' &&
      process.env.CM_HTTP_PORT &&
      process.env.CM_HTTP_HOST) {
        this.parent.add(new LokiTransport({
          host: process.env.CM_HTTP_HOST,
          port: parseInt(process.env.CM_HTTP_PORT),
          label: 'cubemoji'
        }))
      }
    }

    // now setup child loggers
    this.main = this.parent.child({ module: 'Main' })
    this.command = this.parent.child({ module: 'Command' })
    this.autocomplete = this.parent.child({ module: 'Autocomplete' })
    this.discordLogic = this.parent.child({ module: 'DiscordLogic' })
    this.emoteCache = this.parent.child({ module: 'EmoteCache' })
    this.imageQueue = this.parent.child({ module: 'ImageQueue' })
    this.storage = this.parent.child({ module: 'Storage' })
    this.workerPool = this.parent.child({ module: 'WorkerPool' })
    this.imageLogic = this.parent.child({ module: 'ImageLogic' })
    this.messageManager = this.parent.child({ module: 'MessageManager' })
    this.events = this.parent.child({ module: 'Events' })
    this.databaseMgmt = this.parent.child({ module: 'DatabaseManagement' })
    this.client = this.parent.child({ module: 'Client' })
    this.web = this.parent.child({ module: 'web' })
  }
}
