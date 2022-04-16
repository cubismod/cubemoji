import { importx } from "@discordx/importer";
import { Koa } from "@discordx/koa";
import { container, singleton } from "tsyringe";
import { CubeLogger } from "../logger/CubeLogger";

// used for tsyringe object representing server
@singleton()
export class CubeServer {
  private logger = container.resolve(CubeLogger).web;
  private server = new Koa();

  // build and startup Koa service
  async start() {
    await importx('./build/lib/http/koa/*.js');
    await this.server.build();

    this.server.listen(7923, () => {
      this.logger.info('HTTP server started on port 7923');
    });
  }
}
