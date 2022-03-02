// primitive HP responder for health checks with fly.io
import { createServer } from 'http'
import { logManager } from '../LogManager'

export function setupHTTP () {
  const logger = logManager().getLogger('Web')
  const server = createServer((request, response) => {
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/plain')
    response.end('cubemoji is online...')
    logger.debug(request.headers)
  })

  server.listen(7923, '0.0.0.0')
}
