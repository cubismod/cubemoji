import { DIService } from 'discordx'
import { config } from 'dotenv'
import { container } from 'tsyringe'
import { CubeStorage } from '../lib/db/Storage'
import { WorkerPool } from '../lib/image/WorkerPool'
import { CubeLogger } from '../lib/logger/CubeLogger'
import { discSuite } from './suites/Discord'
import { editSuite, rescaleSuite } from './suites/Image'

DIService.container = container

// load dotenv file if exists
config()

const storage = new CubeStorage()
await storage.initHosts()

container.register(CubeLogger, {useValue: new CubeLogger()})
container.register(CubeStorage, {useValue: storage})
container.register(WorkerPool, {useValue: new WorkerPool(10)})

discSuite.run()
rescaleSuite.run()
editSuite.run()