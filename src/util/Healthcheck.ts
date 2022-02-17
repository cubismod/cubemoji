// primitive HP responder for health checks

import { createServer } from 'http'

export function setupHTTP () {
  const server = createServer((request, response) => {
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/plain')
    response.end('cubemoji is online...')
  })

  server.listen(7923, '0.0.0.0')
}
