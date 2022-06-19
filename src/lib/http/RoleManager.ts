// Role Manager
// Handles generating and tracking role management
// webpages for Discord users

import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { Client as jsClient } from 'discord.js';
import { Client } from 'discordx';
import { appendFile } from 'fs/promises';
import { randomString } from 'pandemonium';
import path from 'path';
import { container } from 'tsyringe';
import { CubeStorage } from '../db/Storage';
import { CubeLogger } from '../logger/CubeLogger';

const storage = container.resolve(CubeStorage);
const logger = container.resolve(CubeLogger).discordLogic;

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
 * This will fail if the Role Picker feature is disabled on that
 * server by an administrator or if there is no config defined for
 * that server on Git.
 * @param userID user who triggers the command
 * @param serverID server in which that command is triggered
 * @returns false if server is not enrolled in roles system
 */
export async function rolesCommand(userID: string, serverID: string) {
  const ephemKey = `${serverID}-${userID}`;
  const serverConfig = await storage.rolePickers.get(serverID);
  if (serverConfig && serverConfig[0]) {
    // check user config
    const userLink = await storage.ephemeralLinks.get(ephemKey);

    if (!userLink) {
      // generate new ephemeral link
      const id = randomString(10, 12);
      const newLink: ephemeralLink = {
        id,
        serverID,
        url: `${process.env.CM_URL}/roles/${id}`,
        userID,
        expires: dayjs().add(20, 'minute').unix()
      };
      await storage.ephemeralLinks.set(ephemKey, newLink);
      await storage.uniqueIDLookup.set(id, ephemKey);
    }

    const link = await storage.ephemeralLinks.get(ephemKey);
    return `You can access your profile to edit roles at: ${link?.url}. This expires <t:${link?.expires}:R> , although you can click the button below to delete it early (your roles will not be deleted, just the temporary page).`;
  } else {
    return 'This server is not enrolled in the roles feature. Ask the administrator to enable it.';
  }
}

export async function clearPage(userID: string, serverID: string) {
  await storage.ephemeralLinks.delete(`${serverID}-${userID}`);
}

/**
 * check whether the bot has the permissions to manage roles
 * in the requested server
 * @param serverID server to check
 * @param client Discord client
 * @returns true if can change perm, false if can't
 */
export async function rolePermissionCheck(serverID: string, client: Client | jsClient) {
  const guild = client.guilds.resolve(serverID);
  if (guild && client.user) {
    if (guild.members.resolve(client.user.id)?.permissions.has('MANAGE_ROLES')) return true;
  }
  logger.error(`Cubemoji is missing manage role permissions on server ID: ${guild?.id}, name: ${guild?.name}`);
  return false;
}

/**
 * Generates a list of user modifiable roles available
 * to the Role Picker webpage on a particular server
 * @param serverID server to check
 * @returns list of role IDs or undefined if no config exists
 */
export async function genRolesList(serverID: string) {
  const rolePicker = await storage.rolePickers.get(serverID);
  if (rolePicker) {
    const roles: string[] = [];
    for (const category of rolePicker[1].categories) {
      for (const role of category.roles) {
        roles.push(role);
      }
    }
    return roles;
  }
}

/**
 * Create a text file of all server roles and names
 * @param serverID server id
 */
export async function allRoles(serverID: string) {
  const fileName = path.join('./download', randomUUID() + '.txt');

  const client = container.resolve(Client);
  const roles = client.guilds.resolve(serverID)?.roles;
  if (roles) {
    for (const role of roles.cache) {
      await appendFile(fileName, `${role[1].id} : ${role[1].name} \n`);
    }
    return fileName;
  }
}

/**
 * take form data from HTML submission and then
 * perform an update if possible
 * @param roleID
 * @param checkValue
 */
export async function performRoleUpdates(roleID: string, checkValue: string | undefined, userID: string, serverID: string) {
  const client = container.resolve(Client);

  const member = await client.guilds.resolve(serverID)?.members.resolve(userID);
  const existingState = member?.roles.resolve(roleID);
  const reason = 'cubemoji role picker';
  try {
    if (existingState) {
      // user has the role
      if (!checkValue) {
        // removing the role
        logger.info(`Removing role: ${roleID} from user: ${userID} in guild: ${serverID}`);
        await member?.roles.remove(roleID, reason);
      }
    } else {
      if (checkValue) {
        logger.info(`Adding role: ${roleID} to user: ${userID} in guild: ${serverID}`);
        await member?.roles.add(roleID, reason);
      }
    }
  } catch (err) {
    logger.error(err);
  }
}
