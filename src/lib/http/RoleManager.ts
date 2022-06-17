// Role Manager
// Handles generating and tracking role management
// webpages for Discord users

import { randomUUID } from 'crypto';
import { container } from 'tsyringe';
import { CubeStorage } from '../db/Storage';

const storage = container.resolve(CubeStorage);

export interface ephemeralLink {
  id: string,
  userID: string,
  serverID: string,
  url: string
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
    if (userLink) return userLink;
    else {
      // generate new ephemeral link
      const id = randomUUID().slice(0, 10);
      const newLink: ephemeralLink = {
        id,
        serverID,
        url: `${process.env.CM_URL}/roles/${id}`,
        userID
      };
      await storage.ephemeralLinks.set(ephemKey, newLink);
    }
  } else {
    return 'This server is not enrolled in the roles feature. Ask the administrator to enable it.';
  }
}
