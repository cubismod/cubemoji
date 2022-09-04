import { Attachment, CommandInteraction, GuildMember, Message } from 'discord.js';
import { parseSource, reply } from '../../../lib/image/DiscordLogic';
import strings from '../../../res/strings.json' assert {type: 'json'};
import { container } from 'tsyringe';
import { CubeMessageManager } from '../../../lib/cmd/MessageManager';

export class SourceCommand {
  source?: string;
  member?: GuildMember;
  attachment?: Attachment;
  private cubeMessageManager = container.resolve(CubeMessageManager);

  /**
     * Commands involving the following inputs:
     * - Image URLs
     * - Guild Members
     * - Attachments
     * that can be instantiated and used within Slash command classes
     * @param source image URL
     * @param member a discord guild member
     * @param attachment an attachment sent through the client file picker
     * @protected
     */
  constructor(source?: string, member?: GuildMember, attachment?: Attachment) {
    this.source = source;
    this.member = member;
    this.attachment = attachment;
  }

  /**
     * Expects interaction to be
     * deferred already
     * @param interaction Discord interaction for the command
     */
  async parseCommand(interaction: CommandInteraction) {
    if (this.source) {
      return await parseSource(interaction, this.source);
    } else if (this.member) {
      return this.member.displayAvatarURL({ size: 256, extension: 'png' });
    } else if (this.attachment) {
      return await parseSource(interaction, this.attachment.url);
    }
  }

  /**
   * Checks if all arguments are undefined and
   * returns an error the user indicating that they need
   * to enter something since they're optional
   *
   * @param interaction
   * @returns a promise for a message or undefined
   * @protected
   */
  async invalidArgsCheck(interaction: CommandInteraction) {
    if ((this.member === undefined) &&
        (this.source === undefined) &&
        (this.attachment === undefined)) {
      return await reply(interaction, strings.noArgs);
    }
  };

  /**
   * replies to a deferred interaction to let the user
   * know that an emoji could not be found
   * @param interaction
   */
  async couldNotFind(interaction: CommandInteraction) {
    await interaction.editReply(strings.noEmoteFound);
  }

  async registerTrash(interaction: CommandInteraction, msg?: Message) {
    if (msg) {
      await this.cubeMessageManager.registerTrashReact(
        interaction,
        msg,
        interaction.user.id
      );
    }
  }
}
