// custom HTTP Loki transport using winston
// uses Got https://www.npmjs.com/package/got for HTTP

import dayjs from 'dayjs';
import TransportStream, { TransportStreamOptions } from 'winston-transport';
const { got } = await import('got');

export interface LokiTransportOptions extends TransportStreamOptions {
  host: string,
  port: number,
  label: string;
}

/**
 * https://github.com/winstonjs/winston#streams-objectmode-and-info-objects
 */
export interface LokiInfoObj {
  level: string,
  message: string,
  module: string,
  timestamp: string,
  stack: string | undefined,
  name: string | undefined;
}

export class LokiTransport extends TransportStream {
  host: string;
  port: number;
  label: string;

  /**
   * Create a new Loki transport
   * @param options extends the TransportOptions interface to add the following members:
   * - host: host you're sending log messages to
   * - port: port number to send messages to
   * - label: what to label the messages as in Loki
   */
  constructor(options: LokiTransportOptions) {
    super(options);
    this.host = options.host;
    this.port = options.port;
    this.label = options.label;
  }

  async log(info: LokiInfoObj, next: () => void) {
    // first construct a value we can send with GOT
    // https://grafana.com/docs/loki/latest/api/#post-lokiapiv1push
    const body = {
      streams: [
        {
          stream: {
            label: this.label
          },
          values: [
            [
              // timestamp format: https://github.com/winstonjs/logform#timestamp
              // need to get this in Nanoseconds for Loki
              dayjs(info.timestamp).millisecond() * 1e+6,
              info
            ]
          ]
        }
      ]
    };

    await got.post(
      `http://${this.host}:${this.port}/loki/api/v1/push`,
      {
        json: body,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: {
          request: 10000
        }
      }
    ).catch(err => console.error(err));
    // fail quietly and don't create an infinite loop of error messages

    if (info.level !== 'info') {
      // log to gotify as well
      const gotifyUrl = process.env.CM_GO_URL;
      const gotifyToken = process.env.CM_GO_TOKEN;

      if (gotifyUrl && gotifyToken) {
        const body = {
          title: info.module,
          priority: 4,
          message: JSON.stringify(info, null, 2)
        };

        await got.post(
          `${gotifyUrl}/message?token=${gotifyToken}`,
          {
            json: body,
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: {
              request: 10000
            }
          }
        ).catch(err => console.error(err));
      }
    }

    next();
  }
}
