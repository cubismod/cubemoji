import { watch } from 'chokidar'
import { CommandInteraction, Message, MessageAttachment } from 'discord.js'
import { Discord, Slash, SlashChoice, SlashOption } from 'discordx'
import { container } from 'tsyringe'
import { getUrl } from '../../CommandHelper'
import { CubeMessageManager } from '../../Cubemoji'
import { performAddFace } from '../../ImgEffects'
import strings from '../../res/strings.json'

@Discord()
export abstract class AddFace {
  @Slash('addface', { description: 'Adds a face or...other to an emote or image' })
  async addface (
    @SlashOption('source', { description: strings.sourceSlash, required: true })
      source: string,
    @SlashChoice('joy')
    @SlashChoice('pensive')
    @SlashChoice('plead')
    @SlashChoice('thinking')
    @SlashChoice('triumph')
    @SlashChoice('weary')
    @SlashChoice('zany')
    @SlashChoice('flushed')
    @SlashOption('face', { description: 'face to composite on an image', required: true })
      face: string,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply()
    const url = await getUrl(source)
    if (url) {
      const filename = await performAddFace(url, face)
      if (filename) {
        // wait for file creation
        const watcher = watch(filename, { awaitWriteFinish: true })
        const cubeMessageManager = container.resolve(CubeMessageManager)
        watcher.on('add', async () => {
          const msg = await interaction.editReply({ files: [new MessageAttachment(filename)] })
          await watcher.close()
          if (!msg) {
            console.error('could not get a message during rescale, not proceeding with adding trash react')
          } else {
            if (msg instanceof Message) cubeMessageManager.registerTrashReact(interaction, msg)
          }
        })
      }
    }
  }
}
