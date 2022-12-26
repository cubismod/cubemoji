// custom HTTP transport to Ntfy
// uses Got https://www.npmjs.com/package/got for HTTP

import { RequestError } from 'got';
import TransportStream, { TransportStreamOptions } from 'winston-transport';
import { stringify } from 'yaml';
const { got } = await import('got');

export interface NtfyTransportOptions extends TransportStreamOptions {
  host: string,
  auth: string;
}

/**
 * https://github.com/winstonjs/winston#streams-objectmode-and-info-objects
 */
export interface NtfyInfoObj {
  level: string,
  message: string,
  module: string,
  timestamp: string,
  stack: string | undefined,
  name: string | undefined;
}

export class NtfyTransport extends TransportStream {
  host: string;
  auth: string;

  /**
   * Create a new Ntfy transport
   * @param options extends the TransportOptions interface to add the following members:
   * - host: host you're sending log messages to
   * - auth: base64 encoded auth for ntfy
   */
  constructor(options: NtfyTransportOptions) {
    super(options);
    this.host = options.host;
    this.auth = options.auth;
  }

  async log(info: NtfyInfoObj, next: () => void) {
    if (info.level !== 'info' || info.message.includes('now running...')) {
      const yamlMessage = stringify(info);
      await got.post(
        `${this.host}/cubemoji`,
        {
          headers: {
            Authorization: `Basic ${this.auth}`,
            Title: info.module,
            Priority: 'high'
          },
          body: yamlMessage,
          timeout: {
            request: 10000
          }
        }
      ).catch(err => {
        if (err instanceof RequestError) {
          console.error({
            code: err.code,
            response: err.response?.body,
            reqBody: err.request?.options.body
          });
        } else {
          console.error(err);
        }
      });
    }

    next();
  }
}
