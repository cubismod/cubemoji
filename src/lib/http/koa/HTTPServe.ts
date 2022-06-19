import { Get, Middleware, Post, Router } from '@discordx/koa';
import { RouterContext } from '@koa/router';
import { Client } from 'discordx';
import { stat } from 'fs/promises';
import { Context, Next } from 'koa';
import koaBody from 'koa-body';
import koaCompress from 'koa-compress';
import send from 'koa-send';
import { compileFile } from 'pug';
import { container } from 'tsyringe';
import { CubeStorage } from '../../db/Storage';
import { CubeLogger } from '../../logger/CubeLogger';
import { genRolesList, performRoleUpdates } from '../RoleManager';

async function LogRequest(ctx: RouterContext, next: Next) {
  const logger = container.resolve(CubeLogger).web;
  // const trxId = randomUUID();
  // logger.info({
  //   type: 'request',
  //   trxId,
  //   headers: ctx.headers,
  //   url: ctx.URL.pathname
  // });

  await next();

  if (!ctx.URL.pathname.startsWith('/emotes' || !ctx.URL.pathname.startsWith('/favicon'))) {
    // don't log what will be passed off to Fly
    logger.info({
      type: 'response',
      url: ctx.URL.pathname,
      headers: ctx.headers,
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

  /**
   * validate that a unique ID corresponds to
   * an open user role picking session in DB
   * @param id random string of characters and numbers
   * @returns undefined if validation fails or context about
   *          the request if it succeeds
   */
  private async uniqueIDValidation(id: string) {
    const serverUserIDKey = await this.storage.uniqueIDLookup.get(id);
    if (serverUserIDKey) {
      const ephemeralLink = await this.storage.ephemeralLinks.get(serverUserIDKey);
      if (ephemeralLink) {
        const roleBody = await this.storage.rolePickers.get(ephemeralLink.serverID);
        return { roleBody, serverUserIDKey, ephemeralLink };
      }
    }
  }

  @Get(/\/roles\/.+/)
  async rolePickerWeb(context: Context) {
    const client = container.resolve(Client);
    const split = context.path.split('/');
    if (split.length > 2) {
      const id = split[2];

      const res = await this.uniqueIDValidation(id);

      if (res && res.roleBody) {
        // now we finally have found the role information so time to generate a Pug page
        const serverAndUserID = res.serverUserIDKey.split('-');
        const guild = client.guilds.resolve(serverAndUserID[0]);
        await guild?.fetch();

        const serverName = guild?.name;
        const serverIcon = guild?.iconURL();
        const userRoles = guild?.members.cache.get(res.ephemeralLink.userID)?.roles.cache;
        const userNickname = guild?.members.cache.get(res.ephemeralLink.userID)?.displayName;

        if (serverAndUserID.length > 1 && serverName && serverIcon && guild && userRoles && userNickname) {
          const template = compileFile('./assets/template/RolePicker.pug');
          const body = template({
            serverIcon,
            serverID: res.roleBody[1].serverID,
            serverName,
            roleCategories: res.roleBody[1].categories,
            roleManager: guild.roles.cache,
            userRoles,
            userNickname,
            userID: res.ephemeralLink.userID,
            uniqueID: res.ephemeralLink.id
          });

          context.body = body;
          return;
        }
      }
    }
    context.body = compileFile('./assets/template/500.pug')();
    context.status = 500;
  }

  @Post('/submitroles')
  @Middleware(koaBody({
    multipart: true,
    urlencoded: true
  }))
  async submitRoles(context: Context) {
    // now we have to extract details from the request
    const parseResult = await this.parseFormBody(context.request.body);
    const template = compileFile('./assets/template/RoleResult.pug');

    if (parseResult) {
      context.body = template({ success: true });

      // clear up all traces in database
      const lookup = await this.storage.uniqueIDLookup.get(context.request.body.uniqueID);
      await this.storage.uniqueIDLookup.delete(context.request.body.uniqueID);
      if (lookup) await this.storage.ephemeralLinks.delete(lookup);
    } else {
      context.body = template({ success: false });
    }
  }

  /**
   * parse an html form body
   * @param body object of form items with
   * role ids corresponding with checked buttons
   * @returns true if completely parsed, false if not
   */
  private async parseFormBody (body: any) {
    const uniqueID: string | undefined = body.uniqueID;
    const serverID: string | undefined = body.serverID;
    const userID: string | undefined = body.userID;

    if (uniqueID && serverID && userID) {
      // track down the corresponding database entry for this link
      const res = await this.uniqueIDValidation(uniqueID);

      if (res && res.roleBody) {
        const roleslist = await genRolesList(serverID);
        if (roleslist) {
          for (const role of roleslist) {
            // check against the body to determine checked/unchecked roles
            const checkValue: string | undefined = body[role];

            await performRoleUpdates(role, checkValue, userID, serverID);
          }
          // success state
          return true;
        }
      }
    }
    return false;
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
