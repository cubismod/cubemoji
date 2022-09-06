import { Attachment, CommandInteraction, GuildMember, Message } from 'discord.js';
import { getUrl, reply } from '../../../lib/image/DiscordLogic';
import strings from '../../../res/strings.json' assert {type: 'json'};
import { container } from 'tsyringe';
import { CubeMessageManager } from '../../../lib/cmd/MessageManager';

/**
 * Commands involving the following inputs:
 * - Image URLs
 * - Guild Members
 * - Attachments
 * that can be extended to Slash command classes
 * you should pass source, member, or attachment
 * using this.source for example
 */
export abstract class SourceCommand {
  source?: string;
  member?: GuildMember;
  attachment?: Attachment;
  private cubeMessageManager = container.resolve(CubeMessageManager);

  /**
     * Expects interaction to be
     * deferred already
     * @param interaction Discord interaction for the command
     */
  protected async parseCommand(interaction: CommandInteraction) {
    if (this.source) {
      return await getUrl(this.source, interaction.guildId);
    } else if (this.member) {
      return this.member.displayAvatarURL({ size: 256, extension: 'png' });
    } else if (this.attachment) {
      return await getUrl(this.attachment.url, interaction.guildId);
    }
  }

  /**
   * Checks if all arguments are undefined and
   * returns an error the user indicating that they need
   * to enter something since they're optional
   *
   * @param interaction
   * @returns a promise for a message or undefined
   */
  protected async invalidArgsCheck(interaction: CommandInteraction) {
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
  protected async couldNotFind(interaction: CommandInteraction) {
    await interaction.editReply(strings.noEmoteFound);
  }

  protected async registerTrash(interaction: CommandInteraction, msg?: Message) {
    if (msg) {
      await this.cubeMessageManager.registerTrashReact(
        interaction,
        msg,
        interaction.user.id
      );
    }
  }
}
