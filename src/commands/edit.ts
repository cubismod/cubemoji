import Discord = require('discord.js')
import Pandemonium = require('pandemonium')
import Emoji = require('node-emoji')
import gm = require('gm')
import path = require('path')
import FileType = require('file-type')
import fs = require('fs')
import effects = require('./img_effects.json')
import embeds = require('../embeds')
import { Cubemoji } from '../types/cubemoji/cubemoji'
import { checkImage, downloadImage } from '../command-helper'
import { ExtMsg } from '../extended-msg'

export class edit implements Cubemoji.Command {
  name = 'edit'
  description = 'Edits an emote/avatar according to the effects you select. Effects are applied in the order you specify them. This process is computationally intense so give it a few seconds to work. GIFs are unlikely to work if they are from tenor or giphy. https://gitlab.com/cubismod/cubemoji/-/wikis/commands/modify'
  usage = 'edit emote|@mention|urlcommand arg1 arg2 opt:arg3 '
  aliases = ['ed', 'modify']
  cooldown = 0
  execute (message: Discord.Message, args: string[], client: Discord.Client, util: Cubemoji.Util, blame: Discord.Snowflake) {
    let random: boolean
    checkImage(message, client, util).then(url => {
      const extMsg = new ExtMsg(message)
      message.channel.startTyping()
      if (!url && (args.length !== 1 && args[0] !== 'hole')) {
        console.log(`${message.author.username} failed to use ${this.name} correctly`)
        extMsg.inlineReply(`You must specify an emote name and filters in the command! \n \`${this.usage}\``)
      } else {
        let res: string | Discord.Emoji
        let resolvedUrl: string
        // secret!!!!
        if (args[0].toLowerCase() === 'hole') {
          // easter egg time
          if (Pandemonium.choice([true, false])) res = Pandemonium.choice<string|Discord.Emoji>(util.cache.createEmoteArray())
          // random option of twemoji
          else res = util.cache.parseTwemoji(Emoji.random().emoji)
          // change up the args
          args = ['hole', 'random']
        } else res = url
        if (res) {
          // const file = path.resolve(`./download/${Date.now()}`)
          // const imgOpts = {
          //   url: res,
          //   dest: file,
          //   extractFilename: false,
          //   timeout: 1000
          // }
          let options: string[] = []
          let argLc
          if ((args.length > 1)) argLc = args[1].toLowerCase()
          else argLc = args[0].toLowerCase()
          if (argLc === 'random' || argLc === 'r') {
            // random effects option
            random = true
            const optLen = Pandemonium.random(1, 10)
            for (let i = 0; i < optLen; i++) {
              options.push(Pandemonium.choice(effects))
            }
          } else {
            // parse command arguments now, anything after the emote name
            options = args.slice(1, 30)
            random = false
          }
          // download the image
          downloadImage(url)
            .then(path => {
              FileType.fromFile(path).then(ft => {
                const img = gm(path)
                // process image effects
                options.forEach(option => {
                  switch (option) {
                    case 'blur':
                      img.blur(5, 20)
                      break
                    case 'charcoal':
                      img.charcoal(Pandemonium.randomFloat(0, 5))
                      break
                    case 'cycle':
                      img.cycle(Pandemonium.random(1, 10))
                      break
                    case 'edge':
                      img.edge(Pandemonium.randomFloat(0.1, 4))
                      break
                    case 'emboss':
                      img.emboss()
                      break
                    case 'enhance':
                      img.enhance()
                      break
                    case 'equalize':
                      img.equalize()
                      break
                    case 'flip':
                      img.flip()
                      break
                    case 'flop':
                      img.flop()
                      break
                    case 'implode':
                      img.implode()
                      break
                    case 'magnify':
                      img.magnify()
                      break
                    case 'median':
                      img.median(Pandemonium.random(1, 10))
                      break
                    case 'minify':
                      img.minify(Pandemonium.random(1, 10))
                      break
                    case 'monochrome':
                      img.monochrome()
                      break
                    case 'mosaic':
                      img.mosaic()
                      break
                    case 'motionblur':
                      img.motionBlur(10, 20, Pandemonium.random(0, 360))
                      break
                    case 'noise':
                      img.noise(10)
                      break
                    case 'normalize':
                      img.normalize()
                      break
                    case 'paint':
                      img.paint(10)
                      break
                    case 'roll':
                      img.roll(Pandemonium.randomIndex(-360, 360), Pandemonium.randomIndex(-360, 360))
                      break
                    case 'rotate':
                      img.rotate('white', Pandemonium.random(-360, 360))
                      break
                    case 'sepia':
                      img.sepia()
                      break
                    case 'shave':
                      img.shave(20, 20, 5)
                      break
                    case 'sharpen':
                      img.unsharp(100)
                      break
                    case 'solarize':
                      img.solarize(Pandemonium.randomFloat(0, 100))
                      break
                    case 'spread':
                      img.spread(Pandemonium.randomFloat(0, 5))
                      break
                    case 'swirl':
                      img.swirl(Pandemonium.random(-360, 360))
                      break
                    case 'threshold':
                      img.threshold(Pandemonium.randomFloat(0, 20))
                      break
                    case 'trim':
                      img.trim()
                      break
                    case 'wave':
                      img.wave(Pandemonium.randomFloat(0.01, 10), Pandemonium.randomFloat(0.01, 10))
                      break
                  }
                })
                img.toBuffer(ft.ext, (err, buff) => {
                  if (err) {
                    const errEmbed = cmdHelper.imgErr(err, helper, message.author)
                    console.error(err)
                    return message.inlineReply(errEmbed)
                  }
                  // now we send out the message
                  const attach = new Discord.MessageAttachment(buff, `${Date.now()}.${ft.ext}`)
                  message.channel.stopTyping(true)
                  let effects = ''
                  if (random) effects = `Effects chain used: ${options.join(' ')}`
                  // send out the effects chain
                  message.inlineReply(effects, attach).then(msg => {
                    // add delete reacts and save a reference to the creator of the original
                    // msg so users cant delete other users images
                    // if this command is intiated through a react, then the person who reacted has the ability to delete the image, therefore we need to save a reference to them instead of the image creator
                    if (blame !== undefined) {
                      helper.rescaleMsgs[msg.id] = blame
                    } else {
                      helper.rescaleMsgs[msg.id] = message.author.id
                    }
                    msg.react('🗑️')
                  })
                    .catch(err => {
                    // couldn't grab message
                      console.error(err)
                    })
                  // delete the source file
                  fs.unlink(path, (err) => {
                    if (err) console.error(err)
                  })
                })
              })
                .catch(err => message.channel.send({ embed: embeds.errorEmbed(2, 'could not determine file type', err) }))
            })
            .catch(err => message.channel.send({ embed: embeds.errorEmbed(2, 'could not download the image', err) }))
        } else {
          message.inlineReply('emote not found!')
        }
      }
      message.channel.stopTyping(true)
    })
      .catch(err => message.channel.send({ embed: embeds.errorEmbed(2, 'checkImage failed', err) }))
  }
}

module.exports = {
  name: 'edit',
  description: 'Edits an emote/avatar according to the effects you select. Effects are applied in the order you specify them. Animated emotes will return static images. This process is computationally intense so give it a few seconds to work. https://gitlab.com/cubismod/cubemoji/-/wikis/commands/modify',
  usage: `edit <emote/@mention> (opt args): ${effects}`,
  aliases: ['ed', 'modify'],
  cooldown: 1,
  execute (message, args, client, helper, blame) {
    
}
