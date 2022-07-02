/* eslint-disable no-undef */
import inspector from 'node:inspector';
import { container, singleton } from 'tsyringe';
import { Milliseconds } from '../constants/Units';
import { BucketContentType, S3Client } from '../db/Storage';
import { CubeLogger } from '../logger/CubeLogger';

@singleton()
export class InspectorWrapper {
  private inspec = new inspector.Session();
  status = false;
  private storage = container.resolve(S3Client);
  private logger = container.resolve(CubeLogger).inspector;
  private interval?: NodeJS.Timeout;

  constructor() {
    this.inspec.connect();
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

  private async intervalTimer () {
    this.inspec.post('Profiler.stop', async (err, { profile }) => {
      if (err !== null) {
        this.logger.error(err);
        return;
      }
      await this.postProfile(profile);
      this.inspec.post('Profiler.disable', (err) => {
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
        await this.intervalTimer();
        if (this.interval) clearInterval(this.interval);
        this.status = false;
        this.logger.info('Stopping performance test.');
        break;
      case false:
        // start new session
        this.inspec.post('Profiler.enable', async() => {
          this.inspec.post('Profiler.start', async (err) => {
            if (err !== null) {
              this.logger.error(err);
            }
            this.interval = setInterval(
              async () => {
                await this.intervalTimer();
              },
              Milliseconds.min
            );
            this.status = true;
            this.logger.info('Starting performance test.');
          });
        });
    }
  }
}
