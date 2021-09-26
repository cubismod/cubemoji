// https://github.com/oceanroleplay/discord.ts-example/blob/main/src/commands/slashes.ts
import { CommandInteraction, GuildEmoji, User } from 'discord.js'
import { Discord, MetadataStorage, Slash, SlashOption } from 'discordx'

@Discord()
export abstract class Info {
  @Slash('info', {
    description: 'Provides information about an emote or user'
  })
  info (
    @SlashOption('emote', { description: 'an emote name or actual emote' })
      emote: string,
    @SlashOption('user')
      user: User,

      interaction: CommandInteraction
  ) {
  }
}
