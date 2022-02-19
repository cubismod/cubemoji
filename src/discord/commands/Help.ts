import { CommandInteraction, MessageEmbed } from 'discord.js'
import { Discord, Slash } from 'discordx'
import strings from '../../res/strings.json'

@Discord()
export abstract class Help {
  @Slash('help', { description: 'A guide on how to use cubemoji' })
  async help (interaction: CommandInteraction) {
    const helpEmbed = new MessageEmbed()
      .setTitle('cubemoji Help')
      .setThumbnail('https://storage.googleapis.com/cubemoji.appspot.com/icon.png')
      .setDescription(strings.helpDescription)
      .addField('Slashes', strings.helpSlashes)
      .addField('Reacts', strings.helpReacts)
      .addField('Finding Emojis', strings.helpFinding)
      .addField('Editing', strings.helpEditing)
      .addField('Utilities', strings.helpUtilities)
      .addField('Feedback', strings.helpFeedback)
      .setColor('#c5e0e9')
    await interaction.reply({ embeds: [helpEmbed], ephemeral: true })
  }
}
