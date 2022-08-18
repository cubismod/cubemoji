import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { Discord, Slash } from 'discordx';
import strings from '../../res/strings.json' assert { type: 'json' };

@Discord()
export abstract class Help {
  @Slash({
    name: 'help',
    description: 'A guide on how to use cubemoji',
    defaultMemberPermissions: 'SendMessages'
  })
  async help(interaction: CommandInteraction) {
    const helpEmbed = new EmbedBuilder()
      .setTitle('cubemoji Help')
      .setThumbnail('https://storage.googleapis.com/cubemoji.appspot.com/icon.png')
      .setDescription(strings.helpDescription)
      .addFields([
        { name: 'Slashes', value: strings.helpSlashes },
        { name: 'Reacts', value: strings.helpReacts },
        { name: 'Finding Emojis', value: strings.helpFinding },
        { name: 'Editing', value: strings.helpEditing },
        { name: 'Utilities', value: strings.helpUtilities },
        { name: 'Feedback', value: strings.helpFeedback }
      ])
      .setColor('#c5e0e9');
    await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
  }
}
