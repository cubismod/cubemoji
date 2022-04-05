import { DIService } from 'discordx'
import { config } from 'dotenv'
import 'reflect-metadata'
import { container } from 'tsyringe'
import { CubeMessageManager } from '../lib/cmd/MessageManager'
import { CubeStorage } from '../lib/db/Storage'
import { BadHosts } from '../lib/http/BadHosts'
import { ImageQueue } from '../lib/image/ImageQueue'
import { WorkerPool } from '../lib/image/WorkerPool'
import { CubeLogger } from '../lib/logger/CubeLogger'
import { databaseSuites } from './suites/Database'
import { discSuites } from './suites/Discord'

async function run () {
  DIService.container = container

  // load dotenv file if exists
  config()

  container.register(CubeLogger, { useValue: new CubeLogger() })

  const badHosts = new BadHosts()
  await badHosts.downloadList()
  const storage = new CubeStorage()

  const imageQueue = new ImageQueue()
  await imageQueue.clear()

  container.register(CubeStorage, { useValue: storage })
  container.register(BadHosts, { useValue: badHosts })
  container.register(WorkerPool, { useValue: new WorkerPool(5) })
  container.register(ImageQueue, { useValue: imageQueue })
  container.register(CubeMessageManager, { useValue: new CubeMessageManager() })

  databaseSuites().forEach((suite) => suite.run())
  discSuites().run()
  // imgSuites().forEach((suite) => suite.run())
}

await run()
