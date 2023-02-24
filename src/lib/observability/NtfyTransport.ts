// custom HTTP transport to Ntfy
// uses Got https://www.npmjs.com/package/got for HTTP

import { request } from 'https';
import TransportStream, { TransportStreamOptions } from 'winston-transport';
import { stringify } from 'yaml';

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

      const req = request({
        hostname: this.host,
        path: '/cubemoji',
        auth: `Basic ${this.auth}`,
        headers: {
          Authorization: `Basic ${this.auth}`,
          Title: info.module,
          Priority: 'high',
          Connection: 'keep-alive'
        },
        method: 'POST',
        timeout: 1000
      }, (res) => {
        res.setEncoding('utf8');
        res.on('error', (err) => { console.error(err); });
        // res.on('data', (chunk) => console.log(chunk));
      });

      req.write(yamlMessage);
      req.end();
    }

    next();
  }
}
