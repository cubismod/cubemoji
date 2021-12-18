// Manages Graphics & ImageMagick operations
// using a queue
import { FSWatcher, watch } from 'chokidar'
import { randomUUID } from 'crypto'
import { Snowflake } from 'discord.js'
import { FileExtension } from 'file-type/core'
import Keyv from 'keyv'
import KeyvFile from 'keyv-file'
import path from 'path'
import { singleton } from 'tsyringe'
import secrets from '../../secrets.json'
import { performAddFace, performRescale } from './ImgEffects'
import { performEdit } from './PerformEdit'

export enum State {
  Waiting,
  Running,
  Success,
  Error
}

export enum JobType {
  Edit,
  Rescale,
  AddFace
}

export interface Job {
  // input filename including ext
  inPath: string,
  inExt: FileExtension,
  // output information
  outPath?: string,
  // user id who initiated this command
  owner: Snowflake,
  // start time for job execution
  starttime?: Number,
  endtime?: Number,
  state: State,
  type: JobType,
  // for edit command
  effects?: string[],
  // for addface command
  face?: string
}

/**
 * Graphics and ImageMagick aren't promise based APIs,
 * rather they execute external shell commands which then perform
 * the operations. So this construct ensures that we limit how many
 * of these processes can be spawned and also provide visibility
 * into job statuses.
 */
@singleton()
export class GmManager {
  private waiting: Job[]
  private running: Job[]
  private history: Keyv<Job>
  private watchers: FSWatcher[]

  // number of concurrent jobs running

  constructor () {
    this.waiting = []
    this.running = []
    this.watchers = []

    this.history = new Keyv<Job>({
      store: new KeyvFile<Job>({
        filename: 'data/jobHistory.json',
        writeDelay: 100
      }),
      ttl: 1.728e+8 // clear entries after 2 days
    })
  }

  /**
   * adding a new job to the queue
   * @param job - create a new job that may be run
   * @returns a choikdar watcher to that file
   */
  public async enqueueJob (job: Job) {
    const filename = this.genFilename(job.inPath, job.inExt)
    job.outPath = filename
    // set an id for the job
    job.state = State.Waiting
    this.waiting.push(job)

    // condition check to see if we can run the job
    if (this.running.length < secrets.concurrentJobs) {
      this.execJob()
    }

    return await this.newWatcher(filename)
  }

  /**
   * execute the job on the top of the queue
   * @returns - true for successful job completion, false for fail
   */
  public async execJob () {
    const top = this.waiting.shift()
    if (top && top.outPath) {
      this.running.push(top)
      await this.saveJobHistory(top)
      let jobResult = false
      switch (top.type) {
        case JobType.AddFace:
          if (top.face) jobResult = await performAddFace(top.inPath, top.face, top.outPath)
          break
        case JobType.Edit:
          if (top.effects) jobResult = await performEdit(top.inPath, top.effects, top.outPath)
          break
        case JobType.Rescale:
          jobResult = await performRescale(top.inPath, top.outPath)
      }
      // log final state of job
      top.endtime = Date.now()
      if (jobResult) top.state = State.Success
      else {
        top.state = State.Error
        console.error(`Error ocurred when executing job: ${top}`)
      }
      await this.saveJobHistory(top)
      return jobResult
    }
    return false
  }

  private async saveJobHistory (job: Job) {
    const name = Date.now().toString()
    await this.history.set(name, job)
  }

  private genFilename (file: string, ext: FileExtension) {
    let spoilered = false
    if (file.toLowerCase().includes('spoiler')) {
      spoilered = true
    }
    const filename = path.resolve(`download/${randomUUID()}.${ext}`)
    if (spoilered) {
      return 'SPOILER_' + filename
    }
    return filename
  }

  private async newWatcher (filename: string) {
    const watcher = watch(filename, { awaitWriteFinish: true })
    this.watchers.push(watcher)
    // keep a max of 50 fs watchers
    if (this.watchers.length > 50) {
      const oldWatcher = this.watchers.shift()
      if (oldWatcher) await oldWatcher.close()
    }
    return watcher
  }
}
