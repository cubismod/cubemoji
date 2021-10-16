import { CommandInteraction, Message, MessageAttachment } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { CubeMessageManager, Effects } from '../../Cubemoji'
import strings from '../../res/strings.json'
import imgEffects from '../../res/imgEffects.json'
import { getUrl } from '../../CommandHelper'
import { parseEffects, performEdit } from '../../ImgEffects'
import { watch } from 'chokidar'
import { container } from 'tsyringe'

@Discord()
export abstract class Edit {
  @Slash('edit', { description: 'Edits an emote/avatar according to the effects you select' })
  async edit (
    @SlashOption('source', { description: strings.sourceSlash })
      source: string,
    @SlashOption('effects', { description: 'a list of effects with spaces between them, if not chosen then random effects will be applied' })
      effects: string,
    @SlashOption('list', { description: 'get a list of the available effects' })
      list: boolean,
      interaction: CommandInteraction
  ) {
    if (list) {
      // just give the user back the effects options
      interaction.reply({ content: imgEffects.join(), ephemeral: true })
    } else {
      if (source === undefined) {
        interaction.reply({ content: `${strings.missingArg} source`, ephemeral: true })
      } else {
        // actual edit work begins here as we have the source arg specified
        await interaction.deferReply()
        const parsedEffects = parseEffects(effects)
        // done parsing the effects, now let's try and parse what we're trying to edit
        const url = await getUrl(source)
        if (url) {
          // now perform the edit
          const filename = await performEdit(url, parsedEffects)
          const cubeMessageManager = container.resolve(CubeMessageManager)
          if (filename) {
            const watcher = watch(filename)
            watcher.on('add', async () => {
              // most likely the file has been created by now
              const attach = new MessageAttachment(filename)
              const msg = await interaction.editReply({ files: [attach] })
              await watcher.close()
              // now add a trash can reaction
              if (msg instanceof Message) cubeMessageManager.registerTrashReact(interaction, msg)
            })
          } else {
            await interaction.editReply('**Error**: could not perform the edit')
          }
        } else {
          await interaction.editReply(strings.imgErr)
        }
      }
    }
  }
}
