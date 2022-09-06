import { Discord, Guard, Slash, SlashOption } from 'discordx';
import { RateLimit, TIME_UNIT } from '@discordx/utilities';
import {
  ApplicationCommand,
  ApplicationCommandOptionType,
  Collection,
  CommandInteraction,
  GuildMember
} from 'discord.js';

@Discord()
@Guard(
  RateLimit(TIME_UNIT.seconds, 10, {
    ephemeral: true,
    rateValue: 3
  })
)

export abstract class HelpRoles {
    @Slash({
      name: 'helproles',
      description: 'show someone how to use roles'
    })
  async helpRoles(
        @SlashOption({
          name: 'who',
          description: 'Who to ping with this information.',
          type: ApplicationCommandOptionType.User,
          required: false
        }) who: GuildMember,
          interaction: CommandInteraction
  ) {
    await interaction.deferReply();
    // get the id of the `/roles` command
    if (interaction.client.application) {
      await this.findSlash(interaction, await interaction.client.application.commands.fetch(), who);
    }
    // try guild commands if we don't have global ones set
    for (const guild of interaction.client.guilds.cache) {
      await this.findSlash(interaction, await guild[1].commands.fetch(), who);
    }
  }

    async findSlash(interaction: CommandInteraction, slashes: Collection<string, ApplicationCommand>, who: GuildMember) {
      for (const slash of slashes) {
        if (slash[1].name === 'roles') {
          const reply = `**How to Set Your </roles:${slash[1].id}> with cubemoji**\nhttps://s3.us-east-1.wasabisys.com/cubemoji/how-to-roles.webm`;
          if (who) {
            await interaction.editReply({
              content: `<@${who.id}> ${reply}`
            });
          } else {
            await interaction.editReply({
              content: reply
            });
            return;
          }
        }
      }
    }
}
