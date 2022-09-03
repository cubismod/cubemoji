/**
 * Commands involving "source"
 * which is an image URL or guild member
 */
import { GuildMember } from 'discord.js';

export abstract class SourceCommand {
  source?: string;
  member?: GuildMember;

  protected constructor(source?: string, member?: GuildMember) {
    this.source = source;
    this.member = member;
  }
}
