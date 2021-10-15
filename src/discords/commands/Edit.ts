import { CommandInteraction, Message, MessageAttachment } from 'discord.js'
import { Discord, Slash, SlashOption } from 'discordx'
import { CubeMessageManager, Effects } from '../../Cubemoji'
import strings from '../../res/strings.json'
import imgEffects from '../../res/imgEffects.json'
import { getUrl } from '../../CommandHelper'
import { generateEditOptions, performEdit } from '../../ImgEffects'
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
        let parsedEffects: Effects[] = []
        await interaction.deferReply()
        // if no edit options specified, we will generate some
        if (effects === undefined) parsedEffects = generateEditOptions()
        else {
          // otherwise we parse effect names from the string given to us in the command
          effects.split(' ').forEach(effect => {
            switch (effect.toLowerCase()) {
              case 'blur':
                parsedEffects.push(Effects.Blur)
                break
              case 'charcoal':
                parsedEffects.push(Effects.Charcoal)
                break
              case 'cycle':
                parsedEffects.push(Effects.Cycle)
                break
              case 'edge':
                parsedEffects.push(Effects.Edge)
                break
              case 'emboss':
                parsedEffects.push(Effects.Emboss)
                break
              case 'enhance':
                parsedEffects.push(Effects.Enhance)
                break
              case 'equalize':
                parsedEffects.push(Effects.Equalize)
                break
              case 'flip':
                parsedEffects.push(Effects.Flip)
                break
              case 'flop':
                parsedEffects.push(Effects.Flop)
                break
              case 'implode':
                parsedEffects.push(Effects.Implode)
                break
              case 'magnify':
                parsedEffects.push(Effects.Magnify)
                break
              case 'median':
                parsedEffects.push(Effects.Median)
                break
              case 'minify':
                parsedEffects.push(Effects.Minify)
                break
              case 'monochrome':
                parsedEffects.push(Effects.Monochrome)
                break
              case 'mosaic':
                parsedEffects.push(Effects.Monochrome)
                break
              case 'motionblur':
                parsedEffects.push(Effects.Motionblur)
                break
              case 'noise':
                parsedEffects.push(Effects.Noise)
                break
              case 'normalize':
                parsedEffects.push(Effects.Normalize)
                break
              case 'paint':
                parsedEffects.push(Effects.Paint)
                break
              case 'roll':
                parsedEffects.push(Effects.Roll)
                break
              case 'sepia':
                parsedEffects.push(Effects.Sepia)
                break
              case 'sharpen':
                parsedEffects.push(Effects.Sharpen)
                break
              case 'solarize':
                parsedEffects.push(Effects.Solarize)
                break
              case 'spread':
                parsedEffects.push(Effects.Spread)
                break
              case 'swirl':
                parsedEffects.push(Effects.Swirl)
                break
              case 'threshold':
                parsedEffects.push(Effects.Threshold)
                break
              case 'trim':
                parsedEffects.push(Effects.Trim)
                break
              case 'wave':
                parsedEffects.push(Effects.Wave)
                break
            }
          })
        }
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
              if (msg instanceof Message) cubeMessageManager.registerDelete(interaction, msg)
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
