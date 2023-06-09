import { Discord } from 'discordx';
import { State } from 'gm';
import PQueue from 'p-queue';
import { container, injectable } from 'tsyringe';
import { Milliseconds } from '../constants/Units.js';
import { CubeLogger } from '../observability/CubeLogger.js';

/**
 * workers here aren't actually tracked in any meaningful way by the program
 * rather they are gm/im processes spawned by the gm module that we track internally
 * so that we don't overload the system with too many image edits at once
 *
 * paths are actually used as index values for GM state objects
 */
@Discord()
@injectable()
export class WorkerPool {
  limit: number;
  runningWorkers: Map<string, State>;
  waitingWorkers: Map<string, State>;
  pQueue = new PQueue({ concurrency: 4 });
  private logger = container.resolve(CubeLogger).workerPool;

  constructor(limit: number) {
    this.runningWorkers = new Map<string, State>();
    this.waitingWorkers = new Map<string, State>();
    this.limit = limit;
  }

  /**
   * add another task to the queue and run if a worker is available
   * @param path output path of image - should be passing a unique GUID in here
   * @param state graphics magick object containing state of edits to perofm
   */
  add(path: string, state: State) {
    this.waitingWorkers.set(path, state);
    this.run(path);
    // or else we wait til next worker finished
  }

  /**
   * run a specific image task if
   * there are workers free to do it
   * @param path output path of image
   */
  private run(path: string) {
    const worker = this.waitingWorkers.get(path);
    if (worker && (this.runningWorkers.size <= this.limit)) {
      this.waitingWorkers.delete(path);
      this.logger.info(`job running: "${path.slice(-8)}"`);
      worker.write(path, (err) => {
        if (err) this.logger.error(err);
      });
      this.runningWorkers.set(path, worker);

      // free up that worker after 5 min if needed...although this doesn't actually
      // stop the gm process
      setTimeout(() => { this.runningWorkers.delete(path); }, Milliseconds.fiveMin);
    } else {
      this.logger.info(`job queued: "${path.slice(-8)}". ${this.waitingWorkers.size} workers are waiting. ${this.runningWorkers.size} workers are running.`);
    }
  }

  /**
   * we actually have to call this from the program as we use a choikdar watcher
   * to watch for file creation, then once we are notified the file has been written and
   * thus the task is over, we call this function to remove that task from the list
   * and possibly trigger another worker to run
   * @param path output path of image
   */
  done(path: string) {
    const worker = this.runningWorkers.get(path);
    if (worker) {
      this.runningWorkers.delete(path);
      this.logger.info(`job finished: "${path.slice(-8)}". ${this.waitingWorkers.size} workers are waiting. ${this.runningWorkers.size} workers are running.`);
      // run next worker
      const paths = this.waitingWorkers.keys();
      for (const p of paths) {
        this.run(p);
      }
    }
  }
}
