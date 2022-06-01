import { CommandInteraction, ContextMenuInteraction, Message, MessageReaction, Snowflake } from 'discord.js';
import { container, singleton } from 'tsyringe';
import { CubeStorage } from '../db/Storage.js';
import { MsgContext } from '../image/ImageLogic.js';
import { CubeLogger } from '../logger/CubeLogger.js';

@singleton()
// used to keep track of cubemoji sent messages
export class CubeMessageManager {
  // first option is the message ID, second option is the user ID who sent the message
  private storage: CubeStorage;
  private logger = container.resolve(CubeLogger).messageManager;
  constructor() {
    this.storage = container.resolve(CubeStorage);
  }

  // register a new trash react to save to our list of reacts
  async registerTrashReact(context: MsgContext, msg: Message, sender: Snowflake) {
    try {
      if (context instanceof ContextMenuInteraction || context instanceof CommandInteraction) {
        if (context.guild &&
          context.guild.me &&
          context.channel &&
          context.guild.me.permissionsIn(context.channelId).has('MANAGE_MESSAGES') &&
          context.guild.me.permissionsIn(context.channelId).has('ADD_REACTIONS') &&
          context.member) {
          // all these checks to ensure cubemoji can delete the message and can also add a react
          msg.react('🗑️');
          await this.storage.trashReacts.set(msg.id, sender);
        }
      }
      if (context instanceof MessageReaction) {
        if (context.message.guild &&
          context.message.guild.me &&
          context.message.author?.id &&
          context.message.guild.me.permissionsIn(context.message.channelId).has('MANAGE_MESSAGES') &&
          context.message.guild.me.permissionsIn(context.message.channelId).has('ADD_REACTIONS')) {
          msg.react('🗑️');
          await this.storage.trashReacts.set(msg.id, sender);
        }
      }
    } catch (err) {
      this.logger.error('Error reacting to message, possibly missing permissions');
      this.logger.error(err);
    }
  }

  // retrieves the user ID in snowflake form or undefined if there is no message associated with that id
  async retrieveUser(messageID: Snowflake) {
    return await this.storage.trashReacts.get(messageID);
  }

  async unregisterMessage(msgID: Snowflake) {
    await this.storage.trashReacts.delete(msgID);
  }
}
