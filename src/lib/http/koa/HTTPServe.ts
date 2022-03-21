import { Get, Middleware, Router } from "@discordx/koa";
import { RouterContext } from "@koa/router";
import { randomUUID } from "crypto";
import { Context, Next } from "koa";
import koaCompress from "koa-compress";
import send from "koa-send";
import { container } from "tsyringe";
import { CubeLogger } from "../../logger/CubeLogger";

async function LogRequest (ctx: RouterContext, next: Next) {
  const trxId = randomUUID()
  const logger = container.resolve(CubeLogger).web
  logger.info({
    type: 'request',
    trxId: trxId,
    url: ctx.URL.pathname,
    headers: ctx.headers
  })
  
  await next()

  logger.info({
    type: 'response',
    trxId: trxId,
    url: ctx.URL.pathname,
    headers: ctx.headers,
    status: ctx.status
  })
}

@Router()
@Middleware(LogRequest)
@Middleware(koaCompress())
export class HTTPServe {
  @Get('/')
  homeRedirect(context: Context) {
    // redirect to gitlab
    context.redirect('https://gitlab.com/cubismod/cubemoji')
  }

  @Get('/status')
  status (context: Context) {
    context.body = 'cubemoji is online...'
  }

  @Get('/list')
  @Get('/list/')
  async list (context: Context) {
    await send(context, 'static/list/emoji.html')
  }

  @Get(/\/emotes.*/)
  @Get(/\/favicon.*/)
  pass (context: Context) {
    // bypass to fly's network
    context.respond = false
  }
}
/* export function setupHTTP () {
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
    } else if (request.url === '/list' || request.url === '/list/') {
      response.writeHead(200, {'content-type': 'text/html'})
      createReadStream('static/list/emoji.html').pipe(response)
    } else if (!request.url?.startsWith('/emotes') && !request.url?.startsWith('/favicon')) {
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
 */