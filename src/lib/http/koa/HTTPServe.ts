import { Get, Middleware, Router } from '@discordx/koa';
import { RouterContext } from '@koa/router';
import { randomUUID } from 'crypto';
import { Context, Next } from 'koa';
import koaCompress from 'koa-compress';
import send from 'koa-send';
import { container } from 'tsyringe';
import { CubeLogger } from '../../logger/CubeLogger';

async function LogRequest(ctx: RouterContext, next: Next) {
  const logger = container.resolve(CubeLogger).web;
  const trxId = randomUUID();
  logger.info({
    type: 'request',
    trxId: trxId,
    headers: ctx.headers,
    url: ctx.URL.pathname
  });

  await next();

  if (!ctx.URL.pathname.startsWith('/emotes' || !ctx.URL.pathname.startsWith('/favicon'))) {
    // don't log what will be passed off to Fly
    logger.info({
      type: 'response',
      trxId: trxId,
      url: ctx.URL.pathname,
      status: ctx.response.status
    });
  }
}

@Router()
@Middleware(LogRequest)
@Middleware(koaCompress())
export class HTTPServe {
  @Get('/')
  homeRedirect(context: Context) {
    // redirect to list
    context.redirect('/list');
  }

  @Get('/status')
  status(context: Context) {
    context.body = 'cubemoji is online...';
  }

  @Get('/list')
  @Get('/list/')
  async list(context: Context) {
    await send(context, 'static/list/emoji.html');
  }

  @Get('/units')
  @Get('/units/')
  async units(context: Context) {
    await send(context, 'static/list/unit.html');
  }

  @Get(/\/emotes.*/)
  @Get(/\/favicon.*/)
  pass(context: Context) {
    // bypass to fly's network
    context.respond = false;
  }

  @Get(/.*/)
  err(context: Context) {
    context.body = '<html><head><title>404 Error!</title></head><body>404 error! Page not found!</br><img src="https://storage.googleapis.com/cubemoji.appspot.com/portalcoffee.svg" width=150 height =150></body></html>';
    context.status = 404;
  }
}
