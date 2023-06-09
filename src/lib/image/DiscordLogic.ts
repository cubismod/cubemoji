// Lots of functions that actually perform the Discord
// commands when doing image effects
import { Pagination, PaginationType } from '@discordx/pagination';
import { watch } from 'chokidar';
import {
  ActivityType,
  AttachmentBuilder,
  Colors,
  CommandInteraction,
  ContextMenuCommandInteraction,
  EmbedBuilder,
  Message,
  MessageFlags,
  MessageReaction,
  PartialUser,
  User
} from 'discord.js';
import { Client } from 'discordx';
import { fileTypeFromStream } from 'file-type';
import { choice } from 'pandemonium';
import { container } from 'tsyringe';
import { URL } from 'url';
import { CubeMessageManager } from '../cmd/MessageManager.js';
import { Milliseconds } from '../constants/Units.js';
import { CubeStorage } from '../db/Storage.js';
import { Cmoji, Source } from '../emote/Cmoji.js';
import { EmoteCache } from '../emote/EmoteCache.js';
import { BadHosts } from '../http/BadHosts.js';
import { CubeLogger } from '../observability/CubeLogger.js';
import { FileQueue } from './FileQueue.js';
import { EditOperation, FaceOperation, MsgContext, RescaleOperation, splitEffects } from './ImageLogic.js';
import { WorkerPool } from './WorkerPool.js';

const { got } = await import('got');

const logger = container.resolve(CubeLogger).discordLogic;

/**
 * Discord logic for performing an image operation
 * Steps:
 * 1. Check if source image/url/emote is valid
 * 2. Indicate to user that we are working with a typing indicator if necessary
 * 3. Queue operation to perform
 * 4. Set a file handler watcher to watch when file is created
 * 5. Send resulting message
 *
 * Rescale is the parent class and edit just extends that class to add parameters
 * for the effects.
 */
export class RescaleDiscord {
  context: MsgContext;
  source: string;
  user: User | PartialUser;
  private logger = container.resolve(CubeLogger).discordLogic;

  constructor(context: MsgContext, source: string, user: User | PartialUser) {
    this.context = context;
    this.source = source;
    this.user = user;
  }

  // perform rescale
  protected async performOp() {
    const rescaleOperation = new RescaleOperation(this.source);
    return await rescaleOperation.run();
  }

  async run() {
    const guildId = getContextGuild(this.context);
    if (this.source === null || guildId === null) return;
    const url = await getUrl(this.source, guildId);
    if (url) {
      // overwrite the source variable from whatever the user inputted
      // to the actual URL we acquired
      this.source = url;

      await startTyping(this.context);
      const filename = await this.performOp();
      if (filename === undefined) {
        // error in performing the command, react with emote
        await reactErr(this.context);
      } else {
        // setup file watcher for resulting output
        const watcher = watch(filename, { awaitWriteFinish: true });

        // here is where we actually perform the reply with the finished image
        watcher.on('add', async () => {
          const cubeMessageManager = container.resolve(CubeMessageManager);
          const imageQueue = container.resolve(FileQueue);
          const workerPool = container.resolve(WorkerPool);

          // now we send out the rescaled message
          try {
            const msg = await reply(this.context, new AttachmentBuilder(filename));
            if (!msg) {
              this.logger.debug('could not get a message during image operation, not proceeding with adding trash react');
            } else if (!msg.flags.has(MessageFlags.Ephemeral)) {
              // check if ephemeral to avoid discord API errors (can't react to an ephermeral message)
              await cubeMessageManager.registerTrashReact(this.context, msg, this.user.id);
              // job is finished so send status to trigger next jobs
              workerPool.done(filename);

              // queue up attachment for later
              const attach = msg.attachments.at(0);

              if (attach !== undefined) {
                imageQueue.enqueue({
                  localPath: filename,
                  id: attach.url
                });
              }
            }
          } catch (err) {
            this.logger.error(err);
          } finally {
            await watcher.close();
          }
        });
      }
    }
  }
}

export class EditDiscord extends RescaleDiscord {
  effects: string[];

  constructor(context: MsgContext, effects: string, source: string, user: User | PartialUser) {
    super(context, source, user);
    this.effects = splitEffects(effects);
  }

  protected async performOp() {
    const editOperation = new EditOperation(this.source, this.effects);
    return await editOperation.run();
  }
}

export class FaceDiscord extends RescaleDiscord {
  face: string;

  constructor(context: MsgContext, face: string, source: string, user: User | PartialUser) {
    super(context, source, user);
    this.face = face;
  }

  protected async performOp() {
    const faceOp = new FaceOperation(this.source, this.face);
    return await faceOp.run();
  }
}

// display a random status message for the bot
export function setStatus(client: Client) {
  // useful help text
  const status = choice([
    'Type /help to learn more about me!',
    'Type / in chat to use my slash commands!',
    'React 📏 to a message to rescale that message content!',
    'React 📷 to a message to randomly edit that message content!',
    'https://cubemoji.art',
    'Type /roles to get your roles!'
  ]);
  client.user?.setActivity(status, { type: ActivityType.Playing });
}

/**
 * checks whether a url is using a proper extension
 * that cubemoji supports, is not on a hostname blocklist,
 * and is using https
 * @param url url to check
 * @param urlType is it an image, txt, or json file
 * @returns boolean indicating valid
 */
export async function isUrl(url: string, urlType = 'image') {
  try {
    const whatwgUrl = new URL(url);

    // only want secure connections
    if (whatwgUrl.protocol !== 'https:') return false;

    // check against blocked hosts
    const badHosts = container.resolve(BadHosts);
    const res = await badHosts.checkHost(whatwgUrl.hostname);
    // on the blocklist, then we don't continue
    if (res) return false;

    // now check the filetype

    let validTypes: string[] = [];
    if (urlType === 'image') {
      // check image file
      validTypes = ['jpg', 'jpeg', 'gif', 'png', 'webp'];
      const stream = await got.stream(url);
      const type = await fileTypeFromStream(stream);
      if (type !== undefined && validTypes.includes(type.ext)) return true;
    } else if (urlType === 'txt') {
      // check headers
      const headers = await got.head(url);
      if (headers.headers['content-type']?.startsWith('text/plain')) return true;
    } else if (urlType === 'json') {
      const headers = await got.head(url);
      if (headers.headers['content-type']?.startsWith('application/json')) return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * checks a string to see if there is an emote or URL there and then returns the URL
 * that we will use for edits
 * @param source URL/emote string
 * @param guildId guild ID snowflake for checking for blocked emotes
 * @returns
 */
export async function getUrl(source: string, guildId?: string | null) {
  const emoteCache = container.resolve(EmoteCache);
  // yes that's a URL we can use for editing
  if (await isUrl(source)) return source;
  else if (emoteCache !== undefined && guildId) {
    // see if it's an emote
    const res = await emoteCache.retrieve(source, guildId);
    if (res === undefined) return undefined;
    else return res.url;
  } else return '';
}

/**
 * gets either a message attachment or content of a message
 * and returns that
 */
export function getMessageImage(message: Message) {
  const attach = message.attachments.random();
  if (message.attachments.size > 0 && attach) {
    return attach.url;
  } else return message.content;
}

/**
 * send a new pagination to the specified interaction
 */
export async function sendPagination(interaction: CommandInteraction, type: Source, emoteCache: EmoteCache, ephemeral: boolean) {
  // first setup embeds
  const embeds: EmbedBuilder[] = [];
  const menuText: string[] = []; // page markers like alphabet-bean for example
  let menuItem = '';
  let embedBody = '';
  let curEmotePage = newPage(new EmbedBuilder(), type);
  let emotesPerPage = 0;
  let emoteSource: Cmoji[] = []; // list of emojis we're pulling from to display
  if (curEmotePage) {
    switch (type) {
      case Source.Discord:
        emoteSource = emoteCache.discEmojis;
        emotesPerPage = 60;
        break;
      case Source.Mutant:
        emoteSource = emoteCache.mutantEmojis;
        emotesPerPage = 120;
        break;
      case Source.ThisServer:
        // collect emotes from the current server and save as Cmoji objs
        // we're not actually using our own emote cache here to build this list
        if (interaction.guild) {
          await interaction.guild.emojis.fetch();
          for (const emoji of interaction.guild.emojis.cache) {
            emoteSource.push(
              new Cmoji(emoji[1])
            );
          }
        }
        emotesPerPage = 60;
        break;
      case Source.Any:
        emoteSource = emoteCache.emojis;
        emotesPerPage = 120;
    }
    for (let i = 0; i < emoteSource.length; i++) {
      const emote = emoteSource[i];

      if (interaction.guildId && !await emoteCache.isBlocked(emote.name, interaction.guildId)) {
        // TODO: implement blocklisting here
        // for discord emojis we want 60 emojis in one embed
        // mutant and any we can do 100 in one embed
        if (embedBody === '') {
          // beginning a new page so let's mark that
          menuItem = `(${menuText.length + 1}): ${emote.name} - `;
        }
        // append to emote list
        if ((type === Source.Discord || type === Source.ThisServer) && emote.guildEmoji) {
          // discord emoji specific code
          embedBody = embedBody.concat(emote.guildEmoji.toString());
        }
        if (type === Source.Any || type === Source.Mutant) {
          // just grab names for these objects
          embedBody = `${embedBody} \`${emote.name}\``;
          if (type === Source.Any) {
            // append (D) for Discord (M) for Mutant
            if (emote.source === Source.Discord) embedBody = `${embedBody} (D)`;
            else embedBody = `${embedBody} (M)`;
          }
        }
        if (i !== 0 && (i % emotesPerPage === 0)) {
          // this is when we reach the max emotes per page
          // get the last emote that we added to the page
          // and add to menu text
          menuItem = menuItem.concat(emoteSource[i - 1].name);
          curEmotePage.setDescription(embedBody);
          curEmotePage.setFooter({ text: menuItem });
          // append page to embeds
          embeds.push(curEmotePage);
          menuText.push(menuItem);
          // clear working page, menu item
          curEmotePage = newPage(new EmbedBuilder(), type);
          menuItem = '';
          embedBody = '';
        } else if (i === emoteSource.length - 1) {
          // if the size of the array isn't a multiple of the emotes per page
          // then we need to also end now
          menuItem = menuItem.concat(emoteSource[i - 1].name);
          curEmotePage.setDescription(embedBody);
          curEmotePage.setFooter({ text: menuItem });
          embeds.push(curEmotePage);
          menuText.push(menuItem);
        }
      }
    }
    // now we send an actual pagination
    await new Pagination(interaction, [{ embeds }], {
      type: PaginationType.SelectMenu,
      // ephemeral: true, have a feeling this is causing api errors
      pageText: menuText,
      showStartEnd: false,
      ephemeral
    }).send();

    await interaction.followUp({ content: `Web list is available at ${process.env.CM_URL}`, ephemeral: true });
  }
}

/**
 * searches the emote cache
 * for an emote
 * @param interaction Discord Command interaction, does not reply
 * @param source name/id of an emote or a URL for an image
 */
// export async function parseSource(interaction: CommandInteraction, source: string) {
//   const emoteCache = container.resolve(EmoteCache);
//   // emote parsing code
//   if (interaction.guildId) {
//     const retrievedEmoji = await emoteCache.retrieve(source, interaction.guildId);
//     if (retrievedEmoji !== undefined) {
//       return retrievedEmoji.url;
//     }
//   }
//   return false;
// }

/**
 * Initializes a new page
 */
function newPage(embed: EmbedBuilder, type: Source) {
  const mutantAttr = 'This bot uses Mutant Standard emoji (https://mutant.tech) which are licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (https://creativecommons.org/licenses/by-nc-sa/4.0/)';
  switch (type) {
    case Source.Discord:
      embed.setTitle('List of Discord Emotes');
      break;
    case Source.Any:
      embed.setTitle('List of All Emotes');
      embed.addFields([
        {
          name: 'License Info',
          value: mutantAttr
        }
      ]);
      break;
    case Source.Mutant:
      embed.setTitle('List of Mutant Emoji');
      embed.addFields([
        {
          name: 'License Info',
          value: mutantAttr
        }]);
      break;
    case Source.ThisServer:
      embed.setTitle('Emoji on this Server');
  }
  embed.setColor(Colors.DarkGold);
  return embed;
}

/**
 * different reply behavior for reactions
 * such as DMing people if they are in a big server
 * @param context MessageReaction object
 * @param content actual message to send
 * @returns undefined if DM message sent or a message object if a message was
 * sent in channel
 */
async function reactReply(context: MessageReaction, content: AttachmentBuilder | string) {
  const enrollment = container.resolve(CubeStorage).serverEnrollment;

  if (context.message.guildId && await enrollment.get(context.message.guildId)) {
    // send a DM as the server is enrolled
    if (content instanceof AttachmentBuilder) {
      // send rescale results in an embed
      const embed = new EmbedBuilder({
        color: Colors.LightGrey,
        description: `Here are the results of your image edit in ${context.message.guild?.name}, done by reacting with an emoji. See https://cubemoji.art/#react for more information. [Link to original](${context.message.url})`
      });

      try {
        await context.message.author?.send({
          files: [content],
          embeds: [embed]
        });
      } catch (err) {
        logger.error(err);
      }
    }
  } else {
    // reply in channel without a ping reply
    if (content instanceof AttachmentBuilder) {
      return await context.message.reply({
        files: [content],
        allowedMentions: { repliedUser: false }
      });
    } else return await context.message.reply({ content, allowedMentions: { repliedUser: false } });
  }
}

// do a different reply depending on the context we have
export async function reply(context: MsgContext, content: AttachmentBuilder | string) {
  let msg: Message | undefined;
  if (content instanceof AttachmentBuilder) {
    // different logic depending on which context we are passing in
    if (context instanceof CommandInteraction) {
      msg = await context.editReply({ files: [content] });
    }
    if (context instanceof ContextMenuCommandInteraction) {
      msg = await context.editReply({ files: [content] });
    }
  } else {
    if (context instanceof CommandInteraction) {
      msg = await context.editReply(content);
    }
    if (context instanceof ContextMenuCommandInteraction) {
      msg = await context.editReply({ content });
    }
  }
  if (context instanceof MessageReaction) {
    msg = await reactReply(context, content);
  }
  return msg;
}

// get the guild id from context obj
function getContextGuild(context: MsgContext) {
  if (context instanceof MessageReaction) {
    return context.message.guildId;
  } else {
    return context.guildId;
  }
}

/**
 * reacts with custom error emote defined in secrets.json
 * and log an error to the console
 * when an image fails its operation if its not a / command
 * @param context either a message or interaction
 */
async function reactErr(context: MsgContext) {
  // TODO: add ephermal followup explaining error details
  const cubeMessageManager = container.resolve(CubeMessageManager);
  let errEmote = '😰';
  if (process.env.CM_BROKEN) errEmote = process.env.CM_BROKEN;
  if (context instanceof CommandInteraction) {
    logger.error(`Command interaction failure on channel id: ${context.channelId}, guild id: ${context.guildId}`);
    const reply = await context.editReply(`${errEmote} this operation failed!`);
    // allow user to delete the error message
    await cubeMessageManager.registerTrashReact(context, reply, context.user.id);
  }
  if (context instanceof ContextMenuCommandInteraction) {
    logger.error(`Context menu failure on channel id: ${context.channelId}, guild id: ${context.guildId}`);
    const msg = await context.channel?.messages.fetch(context.targetId);
    if (msg) {
      try {
        msg.react(errEmote);
      } catch (err) {
        logger.error(err);
      }
    }
    await context.deleteReply();
  }
  if (context instanceof MessageReaction) {
    logger.error(`Message reaction failure on channel id ${context.message.channelId}, guild id: ${context.message.guildId}, message id: ${context.message.id}`);
    await (await context.fetch()).message.react(errEmote);
  }
}

// type to indicate that cubemoji is working on the edit/rescale
async function startTyping(context: MsgContext) {
  if (context instanceof MessageReaction) {
    context.message.channel.sendTyping();
  }
}

// sets a timeout to auto delete a message after 30 seconds
export function autoDeleteMsg(msg: Message | undefined) {
  if (msg) {
    setTimeout(async () => {
      await msg.delete();
    }, Milliseconds.thirtySec);
  }
}
