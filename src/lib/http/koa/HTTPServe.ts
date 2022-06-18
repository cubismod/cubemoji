import { Get, Middleware, Router } from '@discordx/koa';
import { RouterContext } from '@koa/router';
import { randomUUID } from 'crypto';
import { Client } from 'discordx';
import { stat } from 'fs/promises';
import { Context, Next } from 'koa';
import koaCompress from 'koa-compress';
import send from 'koa-send';
import { compileFile } from 'pug';
import { container } from 'tsyringe';
import { CubeStorage } from '../../db/Storage';
import { CubeLogger } from '../../logger/CubeLogger';

async function LogRequest(ctx: RouterContext, next: Next) {
  const logger = container.resolve(CubeLogger).web;
  const trxId = randomUUID();
  logger.info({
    type: 'request',
    trxId,
    headers: ctx.headers,
    url: ctx.URL.pathname
  });

  await next();

  if (!ctx.URL.pathname.startsWith('/emotes' || !ctx.URL.pathname.startsWith('/favicon'))) {
    // don't log what will be passed off to Fly
    logger.info({
      type: 'response',
      trxId,
      url: ctx.URL.pathname,
      status: ctx.response.status
    });
  }
}

@Router()
@Middleware(LogRequest)
@Middleware(koaCompress())
export class HTTPServe {
  private storage = container.resolve(CubeStorage);

  @Get('/')
  async home(context: Context) {
    await send(context, 'static/home.html');
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

  @Get(/\/img.*/)
  async imageFiles(context: Context) {
    // check if file exists
    const fileName = context.path.slice(5);
    const imgPath = `assets/img/${fileName}`;
    if (await stat(imgPath)) {
      await send(context, imgPath);
    } else {
      await this.err(context);
    }
  }

  @Get(/\/roles\/.+/)
  async rolePickerWeb(context: Context) {
    const client = container.resolve(Client);

    const split = context.path.split('/');
    if (split.length > 2) {
      const id = split[2];

      // check if it is a valid Role Request
      const ephemKey = await this.storage.uniqueIDLookup.get(id);
      if (ephemKey) {
        const link = await this.storage.ephemeralLinks.get(ephemKey);
        if (link) {
          const roleBody = await this.storage.rolePickers.get(link.serverID);
          if (roleBody) {
            // now we finally have found the role information so time to generate a Pug page
            const serverAndUserID = ephemKey.split('-');
            const guild = client.guilds.resolve(serverAndUserID[0]);
            await guild?.fetch();

            const serverName = guild?.name;
            const serverIcon = guild?.iconURL();

            if (serverAndUserID.length > 1 && serverName && serverIcon && guild) {
              const template = compileFile('./assets/template/RolePicker.pug');
              const body = template({
                serverIcon,
                serverName,
                roleCategories: roleBody[1].categories,
                roleManager: guild.roles.cache
              });

              context.body = body;
            }
          }
        }
      }
    }
  }

  @Get(/\/emotes.*/)
  @Get(/\/favicon.*/)
  pass(context: Context) {
    // bypass to fly's network
    context.respond = false;
  }

  @Get(/.*/)
  async err(context: Context) {
    context.status = 404;
    await send(context, 'static/404.html');
  }
}
