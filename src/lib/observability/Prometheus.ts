import { collectDefaultMetrics, Registry } from 'prom-client';
import { singleton } from 'tsyringe';

// prometheus client
@singleton()
export class Prom {
  private registry = new Registry();

  counter

  constructor () {
    collectDefaultMetrics({ register: this.registry });
  }
}
