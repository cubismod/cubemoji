import { DIService } from 'discordx'
import { config } from 'dotenv'
import 'reflect-metadata'
import { container } from 'tsyringe'
import { CubeStorage } from '../lib/db/Storage'
import { ImageQueue } from '../lib/image/ImageQueue'
import { WorkerPool } from '../lib/image/WorkerPool'
import { CubeLogger } from '../lib/logger/CubeLogger'
import { discSuite } from './suites/Discord'
import { imgSuites } from './suites/Image'


async function run() {
  DIService.container = container

  // load dotenv file if exists
  config()
  
  container.register(CubeLogger, {useValue: new CubeLogger()})
  
  
  const storage = new CubeStorage()
  await storage.initHosts()
  
  const imageQueue = new ImageQueue()
  await imageQueue.clear()
  
  container.register(CubeStorage, {useValue: storage})
  container.register(WorkerPool, {useValue: new WorkerPool(5)})
  container.register(ImageQueue, {useValue: imageQueue})
  
  
  discSuite.run()
  imgSuites().forEach((suite) => suite.run())
}

await run()