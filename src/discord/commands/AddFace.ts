import { AutocompleteInteraction, CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashChoice, SlashOption } from 'discordx'
import strings from '../../res/strings.json'
import { emoteAutocomplete } from '../../util/Autocomplete'
import { FaceDiscord, getUrl } from '../../util/DiscordLogic'

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
      interaction: CommandInteraction
  ) {
    await interaction.deferReply()
    const url = await getUrl(source)
    if (url) {
      const addFace = new FaceDiscord(interaction, face, url, interaction.user)
      await addFace.run()
    }
  }
}
