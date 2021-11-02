import { CommandInteraction, MessageAttachment } from 'discord.js'
import { Discord, Slash, SlashChoice, SlashOption } from 'discordx'
import { createWriteStream, unlink, writeFile } from 'fs'
import { access } from 'fs/promises'
import path from 'path'
import { grabEmoteCache, sendPagination } from '../../CommandHelper'
import { Source } from '../../Cubemoji'

@Discord()
export abstract class List {
  @Slash('list', {
    description: 'Get a full list of emojis'
  })
  async list (
    @SlashChoice('Discord', 'discord')
    @SlashChoice('Mutant', 'mutant')
    @SlashChoice('All', 'all')
    @SlashChoice('Download', 'download')
    @SlashOption('subset', { description: 'Which subset of emotes would you like to choose from?', required: true })
      subset: string,
      interaction: CommandInteraction) {
    const emoteCache = grabEmoteCache()
    if (emoteCache !== undefined) {
      if (subset === 'download') {
        const listPath = path.resolve('download/emoji-list.txt')
        // create a downloadable list
        // if we don't already have one
        await interaction.deferReply({ ephemeral: true })
        try {
          await access(path.resolve(listPath))
          console.log('reusing existing emoji list')
          // the file does exist!
        } catch {
          console.log('writing new emoji list')
          // the file does not exist so let's create one now
          writeFile(listPath, 'Cubemoji emote list\n(M) indicates a Mutant emoji while (D) indicates a Discord emoji\n\n', err => {
            if (err) throw (err)
          })
          const stream = createWriteStream(listPath, { flags: 'a' })
          // now we build the file
          emoteCache.emojis.forEach(emoji => {
            stream.write(emoji.name)
            if (emoji.source === Source.Discord) stream.write(' (D)\n')
            else stream.write(' (M)\n')
          })
          stream.end()
          // set a timeout to delete this file after an hour so we have something up to date
          setTimeout(async () => {
            await unlink(listPath, (err) => {
              if (err) console.error(err)
            })
          }, 3.6e+6)
        }
        // now we send that file
        interaction.editReply({ files: [new MessageAttachment(listPath)] })
      } else {
        // the code for paginating is encapsulated in this other function
        let type = Source.Any
        if (subset === 'discord') type = Source.Discord
        if (subset === 'mutant') type = Source.Mutant
        sendPagination(interaction, type, emoteCache)
      }
    }
  }
}
