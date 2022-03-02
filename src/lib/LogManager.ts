// uses Log4js to return a logging object
import pkg from 'log4js'

const { configure } = pkg

/**
 * logging is configured to rotate upon 1mb and log both to console out
 * and a file
 * categories are set for various classes and files that log
 */
export function logManager () {
  let level = 'info'
  if (process.env.CM_ENVIRONMENT === 'npr') {
    level = 'debug'
  }

  const categoryConfig = { appenders: ['console', 'file'], level: level, enableCallStack: true }

  return configure({
    appenders: {
      console: {
        type: 'console'
      },
      file: {
        type: 'file',
        filename: 'data/logs/cubemoji.log',
        maxLogSize: 1e+7 // 10MB
      }
    },
    categories: {
      default: categoryConfig,
      Main: categoryConfig,
      Info: categoryConfig,
      List: categoryConfig,
      Autocomplete: categoryConfig,
      DiscordLogic: categoryConfig,
      EmoteCache: categoryConfig,
      ImageQueue: categoryConfig,
      Storage: categoryConfig,
      WorkerPool: categoryConfig,
      ImageLogic: categoryConfig,
      MessageManager: categoryConfig,
      Events: categoryConfig,
      ServerConfig: categoryConfig,
      DatabaseMgmt: categoryConfig,
      Client: categoryConfig,
      Web: categoryConfig,
      Convert: categoryConfig
    }
  })
}
