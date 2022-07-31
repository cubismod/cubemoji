// helper commands for Moderation group

import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Client, Colors, CommandInteraction, EmbedBuilder, TextChannel, User } from 'discord.js';
import { createReadStream } from 'fs';
import { isBinaryFile } from 'isbinaryfile';
import { choice } from 'pandemonium';
import { createInterface } from 'readline';
import { container } from 'tsyringe';
import { ChannelInfo, CubeStorage, ValRaw } from '../db/Storage.js';
import { isUrl } from '../image/DiscordLogic.js';
import { downloadFile } from '../image/ImageLogic.js';
import { CubeLogger } from '../observability/CubeLogger.js';

const logger = container.resolve(CubeLogger).discordLogic;

/**
 * takes an autocomplete formatted text string and extracts the
 * guild ID
 * @param guildIdentifier guild id from autocomplete
 * @returns regular expression result including the snowflake id
 */
function resolveId(guildIdentifier: string) {
  // should match snowflake-servername
  // just snowflake
  // as well as just snowflake w/ snowflake in group 1
  const re = /(.*?)(-|$)/;
  return re.exec(guildIdentifier);
}

/**
 * returns Discord obtained guild id & name if the user
 * owns the server specified or else undefined
 * checks against the discord api as well
 * @param userId id of user we are checking
 * @param guildIdentifier identifier returned from autocomplete function
 * @param client Discord client
 * @returns [guild ID, guild name] or undefined
 */
export async function guildOwnersCheck(userId: string, guildIdentifier: string | null, client: Client) {
  if (guildIdentifier) {
    // extract snowflake from the identifier
    const matches = resolveId(guildIdentifier);
    if (matches) {
      const snowflake = matches[1];
      const resolvedGuild = client.guilds.resolve(snowflake);
      // verify that the guild owner matches the user who invoked the command
      // also a workaround to enable admin perms for the bot owner
      if (resolvedGuild &&
        (resolvedGuild.ownerId === userId || userId === process.env.CM_BOTOWNER)) {
        return [resolvedGuild.id, resolvedGuild.name];
      }
    }
    return undefined;
  }
}

/**
 * validates whether a user has mod permissions by checking their roles
 * against the database
 * @param user user to check roles of
 * @param guildIdentifier name or id of guild we are checking
 * @param client Discord client
 * @returns [guild ID, guild name] or undefined
 */
export async function guildModsCheck(user: User, guildIdentifier: string | null, client: Client) {
  let valid: undefined | [string, string];
  if (guildIdentifier) {
    const matches = resolveId(guildIdentifier);
    if (matches) {
      const snowflake = matches[1];
      const resolvedGuild = client.guilds.resolve(snowflake);
      if (resolvedGuild) {
        // now check roles for the user
        const resolvedMember = resolvedGuild.members.resolve(user);
        if (resolvedMember) {
          // check against database
          const modEnrollment = container.resolve(CubeStorage).modEnrollment;
          for (const role of resolvedMember.roles.cache) {
            // check against each role that member has assigned
            const existsInDb = await modEnrollment.get(resolvedGuild.id + '-' + role[1].id);
            if (existsInDb) {
              valid = [resolvedGuild.id, resolvedGuild.name];
              break;
            }
          }
        }
      }
    }
  }
  return valid;
}

/**
 * validates whether a user has permission to run this command
 * either they are an owner or part of a moderation role
 * @param user user to check
 * @param guildIdentifier id as returned from autocomplete
 * @param client Discord client
 * @returns [guild ID, guild name] or undefined
 */
export async function validUser(user: User, guildIdentifier: string | null, client: Client) {
  let result = await guildOwnersCheck(user.id, guildIdentifier, client);
  // try against mod members
  if (!result) result = await guildModsCheck(user, guildIdentifier, client);
  return result;
}

/**
 * log an audit message to the channel as set in the database
 */
export async function auditMsg(message: {
  action: string,
  notes: string;
  guildId: string,
}, interaction?: CommandInteraction | ButtonInteraction, client?: Client) {
  const auditInfo = container.resolve(CubeStorage).serverAuditInfo;
  // check audit channel first
  const auditChannel = await auditInfo.get(message.guildId);
  if (auditChannel) {
    // try to post to channel and handle any permission errors
    try {
      const channel =
      await interaction?.client.channels.fetch(auditChannel) ??
      await client?.channels.fetch(auditChannel);
      if (channel?.isTextBased()) {
        if (interaction) {
          channel.send(
            {
              embeds: [
                new EmbedBuilder({
                  color: Colors.Fuchsia,
                  description: `**Action**: ${message.action}\n**Invoker**: ${interaction.user.tag} (${interaction.user.id})\n${message.notes}`,
                  timestamp: Date.now()
                })
              ]
            });
        } else if (client) {
          channel.send(
            {
              embeds: [
                new EmbedBuilder({
                  color: Colors.Fuchsia,
                  description: `**Action**: ${message.action}\n${message.notes}`,
                  timestamp: Date.now()
                })
              ]
            }
          );
        }
      }
    } catch (err) {
      logger.error(err);
      // unset channel value so we don't keep erroring ourselves
      await auditInfo.delete(auditChannel);
    }
  }
}

/**
 * reply with an embed to indicate status of action
 * @param interaction discord interaction which should be deferred na
 * @param guildName aka guild name
 * @param success result of action
 * @param action something like 'enroll', 'unenroll', etc.
 * @param notes add'l notes to include for user
 * @param guildId discord provided guildid
 * @param msg send a message in discord, default true
 */
export async function modReply(interaction: CommandInteraction | ButtonInteraction, guildName = '', success: boolean, action: string, notes = '', guildId = '', msg = true) {
  const embed = new EmbedBuilder({
    title: `Action: ${action}`,
    fields: [
      {
        name: 'Server Name',
        value: guildName
      },
      {
        name: 'Status',
        value: success ? 'Success' : `${process.env.CM_BROKEN} Failure`
      }
    ],
    color: success ? Colors.Green : Colors.Red,
    footer: {
      text: 'cubemoji moderation tools'
    }
  });
  if (notes !== '') {
    embed.addFields([
      { name: 'Notes', value: notes }
    ]);
  }
  logger.info(`Action: ${action}| Success: ${success} | Guild: ${guildName}/${guildId} | Invoker: ${interaction.user.tag}`);
  // try to send an audit message
  if (success) {
    await auditMsg({
      action,
      guildId,
      notes
    }, interaction);
  }

  if (msg) await interaction.editReply({ embeds: [embed] });
  return embed;
}

/**
 * These interfaces model
 * https://gitlab.com/cubismod/cubemoji-roles/-/blob/main/schema/roles.json
 */
interface RoleCategory {
  name: string;
  description: string;
  image?: string;
  roles: string[];
  alertOnChange?: boolean;
  radio?: boolean;
}

export interface RolePicker {
  serverID: string,
  categories: RoleCategory[];
}

/**
 * moderation actions to apply
 */
export interface ModAction {
  blocked: boolean;
  type: string; // glob or channel valid options
  glob?: string;
  channelId?: string;
  guildId: string;
  guildName: string;
}

/**
 * Perform bulk moderation actions with a text file
 * https://gitlab.com/cubismod/cubemoji/-/wikis/home#bulk-actions
 * A button is created later on and then the actions are persisted
 * to a database file until they are loaded in
 * src/discord/events/Button.ts
 * @param interaction Discord interaction, this function expects
 * the interaction to be in a deferred state
 * @param fileLink link to plain text file of actions to perform
 */
export async function performBulkAction(interaction: CommandInteraction, fileLink: string) {
  // check URL first
  const valid = await isUrl(fileLink, 'txt');
  if (valid) {
    // download file and parse
    const localPath = await downloadFile(fileLink);
    if (localPath && !await isBinaryFile(localPath)) {
      try {
        const rl = createInterface({
          input: createReadStream(localPath),
          crlfDelay: Infinity
        });

        const actions: ModAction[] = [];

        let ln = 0;

        for await (const line of rl) {
          if (!line.startsWith('#') && !line.startsWith(' ') && line !== '') {
            ln++;
            const errMsg = `Syntax error on line #${ln} in ${fileLink}`;

            // parse each line
            const split = line.split(' ');
            if (split.length < 2) {
              throw new Error(errMsg);
            }

            const type = split[1];
            let guildId = '';
            let glob: string | undefined;
            let chanId: string | undefined;

            if (type === 'channel') {
              chanId = split[2];
              const chan = interaction.client.channels.resolve(split[2]);
              if (chan && chan instanceof TextChannel) {
                guildId = chan.guildId;
              }
            } else if (type === 'glob' && split.length > 2) {
              glob = split[2];
              guildId = split[3];
            }

            let blocked = false;

            switch (split[0]) {
              case '+':
                blocked = true;
                break;
              case '-':
                break;
              default:
                throw new Error(errMsg + '\nCheck that you are using + or - to begin a line');
            }

            const guildInfo = await validUser(interaction.user, guildId, interaction.client);
            if (guildInfo) {
              // save this action
              actions.push({
                blocked,
                channelId: chanId,
                type,
                glob,
                guildId,
                guildName: guildInfo[1]
              });
            }
          }
        }

        await bulkActionsEmbed(interaction, actions, fileLink);
      } catch (err) {
        logger.error(err);
        await modReply(interaction, interaction.guild?.name,
          false, 'Bulk Blocklisting',
          `There was an error downloading or processing the file. Double check that the syntax is correct at https://gitlab.com/cubismod/cubemoji/-/wikis/home#bulk-actions\n*${err}*`);
      }
    }
  } else {
    await modReply(interaction, interaction.guild?.name,
      false, 'Bulk Blocklisting',
      'Ensure you are using the raw text file link and this link is publicly accessible at an https:// url. See here: https://gitlab.com/cubismod/cubemoji/-/wikis/home#bulk-actions');
  }
}

/**
 * displays an embed telling the user the bulk actions they can take and then
 * allows them to confirm with an emoji
 * @param interaction deferred command interaction that is NOT ephemeral
 * @param actions list of actions to take
 */
export async function bulkActionsEmbed(interaction: CommandInteraction, actions: ModAction[], sourceUrl: string) {
  if (actions.length > 0) {
    const humanReadableActions: string[] = [];
    for (const action of actions) {
      humanReadableActions.push(action.blocked ? '⛔ Block ⛔' : '👌 Unblock 👌' + ' ');
      if (action.glob) humanReadableActions.push(` the glob: \`${action.glob}\` that will match to emoji names`);
      if (action.channelId) {
        const chan = await interaction.client.channels.resolve(action.channelId);
        if (chan instanceof TextChannel) humanReadableActions.push(` cubemoji from posting in ${chan.name}`);
      }
      humanReadableActions.push(` in server **${action.guildName}**\n`);
    }

    const embed = new EmbedBuilder({
      title: 'Please confirm you want to perform the below mod actions:',
      description: humanReadableActions.join(''),
      footer: {
        text: 'If you included actions for servers you do not have permissions on, they were automatically removed.'
      },
      fields: [
        { name: 'File Link', value: sourceUrl }
      ],
      color: Colors.Greyple
    });

    const performActions = new ButtonBuilder()
      .setLabel('Perform Actions')
      .setEmoji('👍')
      .setCustomId('mod-action-confirm')
      .setStyle(ButtonStyle.Primary);

    const modStorage = container.resolve(CubeStorage).pendingModActions;

    const repId = await interaction.editReply({
      embeds: [embed],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(performActions)]
    });

    await modStorage.set(repId.id, actions);
  } else {
    await interaction.editReply('Uh, there were no valid items on your blocklist.');
  }
}

/**
 * Creates a list embed of moderation from namespaces.
 * Namespaces are defined in Storage.ts
 * Displayed options are scoped depending on what the user has access to as
 * a guild owner or member of a moderation role
 */
export async function buildList(interaction: CommandInteraction, namespaces: string[]) {
  // max of 10 fields per embed for us
  const storage = container.resolve(CubeStorage);
  let elements = 0;
  const pages: EmbedBuilder[] = [];
  // fune color
  const color = (choice(namespaces).length * 1000000) % 16777215;
  let curEmbed = new EmbedBuilder({ title: 'Moderation List', color });
  // first get all values from a namespace
  for (const ns of namespaces) {
    const items = storage.getNamespace(ns);
    if (items) {
      for (const item of items) {
        if (elements % 10 === 0 && elements !== 0) {
          // new page
          pages.push(curEmbed);
          curEmbed = new EmbedBuilder({ title: 'Moderation List', color });
        }
        // lists are used for several different purposes
        switch (ns) {
          case 'servers': {
            // determine if user has permission over this server
            const info = await validUser(interaction.user, item.key.replace('servers:', ''), interaction.client);
            if (info) {
              // include audit channel if set
              const auditChannel = await storage.serverAuditInfo.get(info[0]);
              let auditInfo = '';
              if (auditChannel) auditInfo = `Audit Channel: <#${auditChannel}>`;
              curEmbed = curEmbed.addFields([
                {
                  name: 'Enrolled Server',
                  value: `*${info[1]}*\nOwner: <@${interaction.client.guilds.resolve(info[0])?.ownerId}>\n${auditInfo}`
                }

              ]);
            }
            break;
          }
          case 'emoji': {
            // emoji json looks like this
            // {"value":"eee**","expires":null}
            const parsedVal: ValRaw = JSON.parse(item.value);
            const glob = parsedVal.value;
            const info = await validUser(
              interaction.user,
              item.key.replace('emoji:', ''), // serverID-globHash
              interaction.client
            );
            if (info) {
              curEmbed = curEmbed.addFields([
                {
                  name: 'Blocked Glob',
                  value: `Glob: \`${glob}\`\nServer: *${info[1]}*`
                }
              ]);
            }
            break;
          }
          case 'channels': {
            const val: ChannelInfo = JSON.parse(item.value).value;
            const info = await validUser(
              interaction.user,
              val.guildId,
              interaction.client
            );
            if (info) {
              curEmbed = curEmbed.addFields([
                {
                  name: 'Blocked Channel',
                  value: `Channel: <#${item.key.replace('channels:', '')}>\nServer: *${info[1]}*`
                }
              ]);
            }
            break;
          }
          case 'mods': {
            const info = await validUser(
              interaction.user,
              item.key.replace('mods:', ''),
              interaction.client
            );
            if (info) {
              curEmbed = curEmbed.addFields([
                {
                  name: 'Moderator Role',
                  // remove namespace tag and server ID in key
                  value: `Role: <@&${item.key.replace(/(.*?-)/, '')}>\nServer: *${info[1]}*`
                }
              ]);
            }
          }
        }
        elements++;
      }
    }
  }
  pages.push(curEmbed);
  return pages;
}
