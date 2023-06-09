import { ApplicationCommandOptionType, AutocompleteInteraction, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import Qty from 'js-quantities';
import { container } from 'tsyringe';
import { unitAutocomplete } from '../../lib/cmd/Autocomplete.js';
import { CubeLogger } from '../../lib/observability/CubeLogger.js';

@Discord()
export abstract class Convert {
  private logger = container.resolve(CubeLogger).command;

  @Slash({
    name: 'convert',
    description: 'perform unit conversions for common scientific calculations (not currency)',
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
    dmPermission: true
  })
  async convert(
    @SlashOption({
      name: 'fromval',
      description: 'the value of whatever you are converting from',
      type: ApplicationCommandOptionType.Number
    }) fromval: number,

    @SlashOption({
      name: 'fromunit',
      description: 'the unit of whatever you are converting from, use "tempC/tempF" for temperature',
      type: ApplicationCommandOptionType.String,
      autocomplete: (interaction: AutocompleteInteraction) => unitAutocomplete(interaction)
    }) fromunit: string,

    @SlashOption({
      name: 'tounit',
      description: 'unit to convert to, use "tempC/tempF" for temperatures',
      type: ApplicationCommandOptionType.String,
      autocomplete: (interaction: AutocompleteInteraction) => unitAutocomplete(interaction)
    }) tounit: string,
      interaction: CommandInteraction
  ) {
    try {
      const qty = Qty(fromval, fromunit);
      const converted = qty.to(tounit);
      interaction.reply(`**${qty.toPrec(0.01).toString()}** is equivalent to **${converted.toPrec(0.01).toString()}**`);
    } catch (err) {
      this.logger.error(err);
      this.logger.error(`from: ${fromval}${fromunit} to ${tounit} by ${interaction.user.tag}`);
      interaction.reply({ content: `Conversion error! Check your units. Error details below:\n\`${err}\``, ephemeral: true });
    }
  }
}
