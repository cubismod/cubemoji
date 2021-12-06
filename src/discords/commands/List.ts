import dayjs from 'dayjs'
import { CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashChoice, SlashOption } from 'discordx'
import { createWriteStream, writeFile } from 'fs'
import path from 'path'
import { grabEmoteCache, grabStorage, sendPagination } from '../../util/CommandHelper'
import { Source } from '../../util/Cubemoji'

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
        const localPath = path.resolve('download/emoji-list.txt')
        const gcpPath = ('txt/emoji-list.txt')
        // create a downloadable list
        // and store in GCP
        // if we don't already have one
        await interaction.deferReply()
        const cubeStorage = grabStorage()
        if (cubeStorage) {
          if (dayjs().unix() > cubeStorage.refreshTime) {
            // now we create a new file
            cubeStorage.refreshTime = dayjs().add(30, 'min').unix()
            console.log('writing new emoji list')
            writeFile(localPath, 'Cubemoji emote list\n(M) indicates a Mutant emoji while (D) indicates a Discord emoji\n\n', err => {
              if (err) throw (err)
            })
            const stream = createWriteStream(localPath, { flags: 'a' })
            // now we build the file
            emoteCache.emojis.forEach(emoji => {
              stream.write(emoji.name)
              if (emoji.source === Source.Discord) stream.write(' (D)\n')
              else stream.write(' (M)\n')
            })
            stream.end()
            // now we delete that old file
            const bucket = cubeStorage.storage.bucket('cubemoji.appspot.com')
            const file = bucket.file(gcpPath)
            await file.delete({ ignoreNotFound: true })
            // and upload the new file
            await bucket.upload(localPath, {
              destination: gcpPath
            })
          }
          // now we send out the message
          interaction.editReply({ content: 'https://storage.googleapis.com/cubemoji.appspot.com/txt/emoji-list.txt' })
          /* try {
            await access(path.resolve(listPath))
            console.log('reusing existing emoji list')
            // the file does exist!
          } catch {
            emoteCache.nextListDelete = dayjs().add(30, 'min').unix()
            console.log('writing new emoji list')
            // the file does not exist so let's create one now

          }
          // now we send that file
          interaction.editReply({ files: [new MessageAttachment(listPath)] })
          // delete the file after 30 minutes to generate a new file next time
          if (dayjs().unix() > emoteCache.nextListDelete) {
            await unlink(listPath, (err) => {
              if (err) console.error(err)
            })
          } */
        }
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
