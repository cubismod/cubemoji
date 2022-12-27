// Role Manager
// Handles generating and tracking role management
// webpages for Discord users

import { SpanStatusCode } from '@opentelemetry/api';
import { Tracer } from '@opentelemetry/sdk-trace-base';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { Client as jsClient, Collection, PermissionFlagsBits, Role } from 'discord.js';
import { Client } from 'discordx';
import { appendFile } from 'fs/promises';
import { randomString } from 'pandemonium';
import path from 'path';
import { container } from 'tsyringe';
import { auditMsg } from '../cmd/ModHelper.js';
import { Milliseconds } from '../constants/Units.js';
import { CubeStorage } from '../db/Storage.js';
import { CubeLogger } from '../observability/CubeLogger.js';

const storage = container.resolve(CubeStorage);
const logger = container.resolve(CubeLogger).discordLogic;

/**
 * id: unique random string
 * userID: discord user id
 * serverID: server id
 * url: actual URL including webhost
 * expires: ephoch seconds
 */
export interface EphemeralLink {
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
 * @returns message indicating result to user
 */
export async function rolesCommand(userID: string, serverID: string) {
  const tracer = container.resolve(Tracer);

  const ephemKey = `${serverID}-${userID}`;
  const serverConfig = await storage.rolePickers.get(serverID);
  const client = container.resolve(Client);
  if (serverConfig && serverConfig[0]) {
    // check user config
    const userLink = await storage.ephemeralLinks.get(ephemKey);

    if (!userLink) {
      return await tracer.startActiveSpan(`role link setup for ${userID} in ${serverID}`, async span => {
        // generate new ephemeral link
        const id = randomString(10, 12);
        const newLink: EphemeralLink = {
          id,
          serverID,
          url: `${process.env.CM_URL}/roles/${id}`,
          userID,
          expires: dayjs().add(20, 'minute').unix()
        };
        await storage.ephemeralLinks.set(ephemKey, newLink);
        await storage.uniqueIDLookup.set(id, ephemKey);
        const guildMemberInfo = await client.guilds.resolve(serverID)?.members.resolve(userID)?.fetch();
        if (guildMemberInfo) {
          // save to cache of local users
          storage.members.set(`${userID}-${serverID}`, guildMemberInfo);

          // and set timeout to delete that entry in 20 min
          setTimeout(() => {
            storage.members.delete(`${userID}-${serverID}`);
          }, Milliseconds.twentyMin);

          span.setAttributes({
            userID,
            serverID
          });

          span.end();

          const link = await storage.ephemeralLinks.get(ephemKey);
          return `You can access your profile to edit roles at: ${link?.url}. This expires <t:${link?.expires}:R> , although you can click the button below to delete it early (your roles will not be deleted, just the temporary page).`;
        }
      });
    }
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
    if (guild.members.resolve(client.user.id)?.permissions.has(PermissionFlagsBits.ManageRoles)) return true;
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

export async function checkedRoles(serverID: string, userRoles: Collection<string, Role> | undefined) {
  const roles = await genRolesList(serverID);

  if (roles && userRoles) {
    const checklist: Map<string, boolean> = new Map();

    for (const role of roles) {
      if (userRoles.has(role)) checklist.set(role, true);
      else checklist.set(role, false);
    }

    return checklist;
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

async function alertOnChange(serverID: string, oldRole: string | undefined, newRole: string, userID: string, username?: string) {
  let action: string = `**Role change for** <@${userID}>, ${username}\n`;
  if (oldRole) {
    action += `Removed role: <@&${oldRole}>\n`;
  }
  action += `Added role: <@&${newRole}>\n`;
  // get audit channel ID
  await auditMsg({
    action,
    notes: '',
    guildId: serverID
  },
  undefined,
  container.resolve(Client)
  );
}

async function getMember(userID: string, serverID: string) {
  return storage.members.get(`${userID}-${serverID}`);
}

/**
 * take form data from HTML submission and then
 * perform an update if possible (switch buttons)
 * @param roleID the role to add/remove
 * @param checkValue false to remove, otherwise add
 * @param userID user's Discord ID
 * @param serverID guild ID
 * @param alert whether to alert on this change
 */
export async function roleUpdatesSwitch(roleID: string, checkValue: string | undefined, userID: string, serverID: string, alert: boolean) {
  const tracer = container.resolve(Tracer);

  await tracer.startActiveSpan(`switch role: ${roleID} update`, async span => {
    const member = await getMember(userID, serverID);
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
          if (alert) {
            await alertOnChange(serverID, undefined, roleID, userID, member?.user.tag);
          }
        }

        span.setAttributes({
          roleID,
          checkValue,
          userID,
          serverID,
          alert
        });

        span.end();
      }
    } catch (err) {
      logger.error(err);
      if (err instanceof Error) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      span.end();
    }
  });
}

/**
 * take form data from an HTML submission
 * and perform an update (radio buttons)
 * @param roles list of role IDs for the category
 * @param roleID newly selected role
 * @param userID user's Discord ID
 * @param serverID guild ID
 * @param alert whether to alert on change
 */
export async function roleUpdateRadio(roles: string[], roleID: string, userID: string, serverID: string, alert: boolean) {
  const member = await getMember(userID, serverID);
  const tracer = container.resolve(Tracer);

  await tracer.startActiveSpan(`radio role: ${roleID} update`, async span => {
  // get current role (if there's one assigned)
    let currentAssignedRole: string | undefined;
    for (const role of roles) {
      if (member?.roles.resolve(role)) currentAssignedRole = role;
    }

    try {
      if (currentAssignedRole && roleID !== currentAssignedRole) {
      // remove old role
        await member?.roles.remove(currentAssignedRole);
      }
      // add new role
      await member?.roles.add(roleID);
      // if we don't this the alert will state that the same role has been removed
      // and added
      if (alert && currentAssignedRole && currentAssignedRole !== roleID) {
        await alertOnChange(serverID, currentAssignedRole, roleID, userID, member?.user.tag);
      }

      span.setAttributes({
        roles,
        userID,
        roleID,
        serverID,
        alert
      });

      span.end();
    } catch (err) {
      logger.error(err);
      if (err instanceof Error) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      span.end();
    }
  });
}
