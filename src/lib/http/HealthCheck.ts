// primitive HP responder for health checks with fly.io
import { createServer } from 'http'
import { container } from 'tsyringe'
import { CubeLogger } from '../logger/CubeLogger.js'

export function setupHTTP () {
  const logger = container.resolve(CubeLogger).web
  const server = createServer((request, response) => {
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/plain')
    response.end('cubemoji is online...')
    logger.debug(request.headers)
  })

  server.listen(7923, '0.0.0.0')
}
