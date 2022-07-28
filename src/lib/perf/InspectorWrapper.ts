/* eslint-disable no-undef */
import { Discord } from 'discordx';
import { randomUUID } from 'node:crypto';
import { open, rm, writeFile } from 'node:fs/promises';
import inspector from 'node:inspector';
import path from 'node:path';
import { container, injectable } from 'tsyringe';
import { Milliseconds } from '../constants/Units';
import { compress } from '../db/DatabaseMgmt';
import { BucketContentType, S3Client } from '../db/Storage';
import { CubeLogger } from '../observability/CubeLogger';

@Discord()
@injectable()
export class InspectorWrapper {
  private cpuInspector = new inspector.Session();
  status = false;
  private memoryInspector = new inspector.Session();
  private storage = container.resolve(S3Client);
  private logger = container.resolve(CubeLogger).inspector;
  private interval?: NodeJS.Timeout;

  constructor() {
    this.cpuInspector.connect();
  }

  private async postProfile (profile: inspector.Profiler.Profile) {
    const pathName = 'cubemoji/' + process.env.CM_ENVIRONMENT + '_' + Date.now() + '.cpuprofile';
    await this.storage.put(
      pathName,
      'performance',
      JSON.stringify(profile),
      BucketContentType.Text
    );
  }

  private async heapDump () {
    const pathName = 'cubemoji/' + process.env.CM_ENVIRONMENT + '_' + Date.now() + '.heapsnapshot';

    const localPath = path.resolve('download/', randomUUID());

    try {
      const fd = await open(localPath, 'w');

      this.memoryInspector.connect();

      this.memoryInspector.on('HeapProfiler.addHeapSnapshotChunk', async (m) => {
        await writeFile(fd, m.params.chunk);
      });

      this.memoryInspector.post('HeapProfiler.takeHeapSnapshot', undefined, async (err, r) => {
        if (err) {
          this.logger.error(err);
          return;
        }
        this.logger.info('Heap Snapshot done');
        this.memoryInspector.disconnect();
        await fd.close();

        // compress file
        const compressedPath = await compress(localPath);

        // save to s3
        await this.storage.put(
          pathName + '.gz',
          'performance',
          compressedPath,
          BucketContentType.Path
        );

        // cleanup file
        await rm(compressedPath);
      });
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async cpuIntervalTime () {
    this.cpuInspector.post('Profiler.stop', async (err, { profile }) => {
      if (err !== null) {
        this.logger.error(err);
        return;
      }
      await this.postProfile(profile);
      this.cpuInspector.post('Profiler.disable', (err) => {
        if (err !== null) {
          this.logger.error(err);
        }
      });
    });
  }

  /**
   * Toggle a profiling session on or off.
   * Saves CPU profiles every 3 minutes to S3 bucket.
   */
  async toggleSession() {
    // are we currently running an inspector session?
    switch (this.status) {
      case true:
        // end current session
        await this.cpuIntervalTime();
        if (this.interval) clearInterval(this.interval);
        this.status = false;
        this.logger.info('Stopping performance test.');
        break;
      case false:
        // start new session
        this.cpuInspector.post('Profiler.enable', async() => {
          this.cpuInspector.post('Profiler.start', async (err) => {
            if (err !== null) {
              this.logger.error(err);
            }
            this.interval = setInterval(
              async () => {
                await this.cpuIntervalTime();
                // take some heap dumps
                await this.heapDump();

                setTimeout(
                  async () => { await this.heapDump(); }, Milliseconds.thirtySec
                );
              },
              Milliseconds.min
            );

            this.logger.info('Starting performance test.');
            this.status = true;

            await this.heapDump();
          });
        });
    }
  }
}
