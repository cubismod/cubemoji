import { CommandInteraction, ContextMenuCommandInteraction, Message, MessageReaction, Snowflake } from 'discord.js';
import { Discord } from 'discordx';
import { container, injectable } from 'tsyringe';
import { CubeStorage } from '../db/Storage.js';
import { MsgContext } from '../image/ImageLogic.js';
import { CubeLogger } from '../observability/CubeLogger.js';

@Discord()
@injectable()
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
      if (context instanceof ContextMenuCommandInteraction || context instanceof CommandInteraction) {
        // all these checks to ensure cubemoji can delete the message and can also add a react
        await msg.react('🗑️');
        await this.storage.trashReacts.set(msg.id, sender);
      }
      if (context instanceof MessageReaction) {
        await msg.react('🗑️');
        await this.storage.trashReacts.set(msg.id, sender);
      }
    } catch (err) {
      this.logger.info('Unable to react to an image, possibly missing permissions');
      this.logger.info(err);
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
