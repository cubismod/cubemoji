import { createReadStream } from 'fs'
import { createServer } from 'http'
import { container } from 'tsyringe'
import { CubeLogger } from '../logger/CubeLogger.js'

export function setupHTTP () {
  // http setup  
  const logger = container.resolve(CubeLogger).web
  const server = createServer((request, response) => {
    if (request.url === '/status') {
      response.statusCode = 200
      response.setHeader('Content-Type', 'text/plain')
      response.end('cubemoji is online...')
    } else if (request.url === '/') {
      // perform a redirect to git page
      response.statusCode = 307
      response.setHeader('Location', 'https://gitlab.com/cubismod/cubemoji')
      response.end()
    } else if (request.url === '/list') {
      response.writeHead(200, {'content-type': 'text/html'})
      createReadStream('static/list/emoji.html').pipe(response)
    } else {
      response.statusCode = 404
      response.setHeader('Content-Type', 'text/plain')
      response.write('404 Error, Page Not Found')
      response.end()
    }
    logger.info({
      url: request.url,
      headers: request.headers,
      status: response.statusCode
    })
  })

  server.listen(7923, '0.0.0.0')
}
