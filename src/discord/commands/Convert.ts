import { CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import Qty from 'js-quantities'
import { container } from 'tsyringe'
import { CubeLogger } from '../../lib/logger/CubeLogger.js'

@Discord()
export abstract class Convert {
  private logger = container.resolve(CubeLogger).command

  @Slash('convert', { description: 'perform unit conversions for common scientific calculations (not currency)' })
  async convert (
    @SlashOption('fromval', {
      description: 'the value of whatever you are converting from',
      type: 'NUMBER'
    }) fromval: number,

    @SlashOption('fromunit', {
      description: 'the unit of whatever you are converting from, use "tempC/tempF" for temperature',
      type: 'STRING'
    }) fromunit: string,

    @SlashOption('tounit', {
      description: 'unit to convert to, use "tempC/tempF" for temperatures',
      type: 'STRING'
    }) tounit: string,
      interaction: CommandInteraction
  ) {
    try {
      const qty = Qty(fromval, fromunit)
      const converted = qty.to(tounit)
      interaction.reply(`${qty.toString()} is equivalent to ${converted.toString()}`)
    } catch (err) {
      this.logger.error(err)
      this.logger.error(`from: ${fromval}${fromunit} to ${tounit} by ${interaction.user.tag}`)
      interaction.reply({ content: `Conversion error! Check your units. Error details below:\n\`${err}\``, ephemeral: true })
    }
  }
}