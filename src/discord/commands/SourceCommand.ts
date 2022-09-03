// a command with a "source" type
// which essentially means an image or avatar of a user

import { GuildMember } from 'discord.js';

export abstract class SourceCommand {
  source?: string;
  member?: GuildMember;

  constructor(source?: string, member?: GuildMember) {
    this.source = source;
    this.member = member;
  }

  protected async;
}
