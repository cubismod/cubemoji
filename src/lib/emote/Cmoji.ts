/* eslint-disable no-unused-vars */
// various other classes used by cubemoji
import { randomUUID } from 'crypto';
import { GuildEmoji, Snowflake } from 'discord.js';
import { adjectives, names, uniqueNamesGenerator } from 'unique-names-generator';

// the emoji can come from a few places
// Discord implies that this carries a GuildEmoji object
// Mutant emojis are from here https://mutant.tech/
// URL is typically for custom emotes not in Cubemoji's client that we can parse
// right from a URL
export enum Source {
  Discord,
  Mutant,
  URL,
  ThisServer,
  Any
}

// an individual emote
export class Cmoji {
  name: string;
  url: string;
  source: Source;
  guildEmoji: GuildEmoji | null; // null if our source isn't Discord
  id: Snowflake; // unique ID is generated for emojis missing an ID otherwise it should be copied from the Discord OBJ

  constructor(guildEmoji: GuildEmoji | null = null, name?: string | null, url?: string, source?: Source, id?: string) {
    if (guildEmoji) {
      this.url = guildEmoji.url;
      this.name = guildEmoji.name ?? uniqueNamesGenerator({ dictionaries: [adjectives, names], length: 1, style: 'lowerCase' });
      this.source = Source.Discord;
      this.id = guildEmoji.id;
      this.guildEmoji = guildEmoji;
    } else {
      // hate this nonsense of a null name, never seen it in the wild
      this.name = name ?? 'unknown_emoji';
      this.url = url ?? 'N/A';
      this.source = source ?? Source.Any;
      this.guildEmoji = guildEmoji;
      // auto generate an ID
      this.id = id ?? randomUUID();
    }
  }
}

export const gotOptions = {
  retry: {
    limit: 4
  },
  timeout: {
    request: 30000
  }
};
