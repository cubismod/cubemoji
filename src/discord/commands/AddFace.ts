import { AutocompleteInteraction, CommandInteraction } from 'discord.js'
import { Client, Discord, Slash, SlashChoice, SlashOption } from 'discordx'
import { emoteAutocomplete } from '../../lib/cmd/Autocomplete'
import { FaceDiscord, getUrl } from '../../lib/image/DiscordLogic.js'
import strings from '../../res/strings.json' assert { type: 'json' }
import { BSGuardData } from '../Guards'

@Discord()
export abstract class AddFace {
  @Slash('addface', { description: 'Adds a face or...other to an emote or image' })
  async addface (
    @SlashOption('source', {
      description: strings.sourceSlash,
      autocomplete: (interaction: AutocompleteInteraction) => emoteAutocomplete(interaction),
      type: 'STRING'
    })
      source: string,
    @SlashChoice('joy')
    @SlashChoice('pensive')
    @SlashChoice('plead')
    @SlashChoice('thinking')
    @SlashChoice('triumph')
    @SlashChoice('weary')
    @SlashChoice('zany')
    @SlashChoice('flushed')
    @SlashOption('face', { description: 'face to composite on an image' })
      face: string,
      interaction: CommandInteraction,
      _client: Client,
      data: BSGuardData
  ) {
    await interaction.deferReply({ ephemeral: data.enrolled, fetchReply: !data.enrolled })
    if (interaction.guildId) {
      const url = await getUrl(source, interaction.guildId)
      if (url) {
        const addFace = new FaceDiscord(interaction, face, url, interaction.user)
        await addFace.run()
      }
    }
  }
}
