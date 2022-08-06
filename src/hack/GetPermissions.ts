// http calls to discord's permission api
// https://discord.com/developers/docs/interactions/application-commands#permissions

import { config } from 'dotenv';
import { writeFile } from 'fs/promises';
import path from 'path';
import { logger } from './Log';
import perms from './perms.json' assert { type: 'json' };
const { got } = await import('got');

config();

async function get() {
  const apiBase = 'https://discord.com/api/v10';

  const applicationID = perms.applicationID;
  const responses: string[] = [];

  for (const guild of perms.guilds) {
    for (const command of guild.commands) {
      try {
        const resp = await got.get(
          `${apiBase}/applications/${applicationID}/guilds/${guild.id}/commands/${command}/permissions`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BEARER}`,
              cookie: process.env.COOKIE
            }
          }
        );
        responses.push(resp.body);
        logger.info(resp.body);
      } catch (err) {
        logger.debug(err);
      }
    }
  }

  try {
    await writeFile(path.join('./data/perms.txt'), responses);
  } catch (err) {
    logger.error(err);
  }
}
await get();
