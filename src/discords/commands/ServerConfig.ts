// Various server configuration commands

import { AutocompleteInteraction } from 'discord.js'
import { Discord, Slash, SlashGroup, SlashOption } from 'discordx'
import { serverAutocomplete } from '../../util/Autocomplete'

@Discord()
@SlashGroup({ description: 'Pare down bot functionality for larger servers', name: 'serverconfig' })
@SlashGroup('enrollment', { description: 'allows bot and server owners to enable mode' })
export abstract class Enrollment {
  @Slash('enroll', { description: 'enroll a new server into big server mode' })
  enroll(
      @SlashOption('server', {
        description: 'name of server you want to enroll',
        autocomplete: (interaction: AutocompleteInteraction) => serverAutocomplete(interaction)
      }) server: string
    )
}
