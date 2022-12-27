import { dirname, importx } from '@discordx/importer';
import { Koa } from '@discordx/koa';
import { Discord } from 'discordx';
import { exit } from 'process';
import { container, injectable } from 'tsyringe';
import { CubeLogger } from '../observability/CubeLogger.js';

// used for tsyringe object representing server
@Discord()
@injectable()
export class CubeServer {
  private logger = container.resolve(CubeLogger).web;
  private server = new Koa();

  // build and startup Koa service
  async start() {
    try {
      await importx(dirname(import.meta.url) + '/koa/*.js');
    } catch (err) {
      this.logger.error(err);
      exit(1);
    }
    await this.server.build();

    this.server.listen(7923, () => {
      this.logger.info('HTTP server started on port 7923');
    });
  }
}
