// Role Manager
// Handles generating and tracking role management
// webpages for Discord users

import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { container } from 'tsyringe';
import { CubeStorage } from '../db/Storage';

const storage = container.resolve(CubeStorage);

/**
 * expires is in epoch seconds
 */
export interface ephemeralLink {
  id: string,
  userID: string,
  serverID: string,
  url: string,
  expires: number
}

/**
 * Response from when a user types the
 * /roles command into Discord
 * @param userID user who triggers the command
 * @param serverID server in which that command is triggered
 * @returns false if server is not enrolled in roles system
 */
export async function rolesCommand(userID: string, serverID: string) {
  const ephemKey = `${serverID}-${userID}`;
  const serverConfig = await storage.rolePickers.get(serverID);
  if (serverConfig) {
    // check user config
    const userLink = await storage.ephemeralLinks.get(ephemKey);

    if (!userLink) {
      // generate new ephemeral link
      const id = randomUUID().slice(0, 10);
      const newLink: ephemeralLink = {
        id,
        serverID,
        url: `${process.env.CM_URL}/roles/${id}`,
        userID,
        expires: dayjs().add(20, 'minute').unix()
      };
      await storage.ephemeralLinks.set(ephemKey, newLink);
    }

    const link = await storage.ephemeralLinks.get(ephemKey);
    return `You can access your profile to edit roles at: ${link?.url}. This expires <t:${link?.expires}:R>`;
  } else {
    return 'This server is not enrolled in the roles feature. Ask the administrator to enable it.';
  }
}

export async function clearPage(userID: string, serverID: string) {
  await storage.ephemeralLinks.delete(`${serverID}-${userID}`);
}
