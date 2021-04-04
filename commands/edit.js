const Discord = require('discord.js')
const Pand = require('pandemonium')
const Emoji = require('node-emoji')
const gm = require('gm')
const download = require('image-downloader')
const path = require('path')
const FileType = require('file-type')
const fs = require('fs')
const effects = require('./img_effects.json')

module.exports = {
  name: 'edit',
  description: 'Edits an emote/avatar according to the effects you select. Effects are applied in the order you specify them. Animated emotes will return static images. This process is computationally intense so give it a few seconds to work. https://gitlab.com/cubismod/cubemoji/-/wikis/commands/modify',
  usage: `edit <emote/@mention> (opt args): ${effects}`,
  aliases: ['ed', 'modify'],
  cooldown: 1,
  execute (message, args, client, helper) {
    const cmdHelper = require('./../command-helper')
    let random
    cmdHelper.checkImage(message, args, client, helper).then(url => {
      message.channel.startTyping()
      if (!url && (args.length !== 1 && args[0] !== 'hole')) {
        console.log(`${message.author.username} failed to use ${this.name} correctly`)
        message.reply(`You must specify an emote name and filters in the command! \n \`${this.usage}\``)
      } else {
        let res
        const cmdStart = Date.now()
        if (args[0].toLowerCase() === 'hole') {
          res = {}
          // easter egg time
          if (Pand.choice([true, false])) res = Pand.choice(helper.cache.createEmoteArray())
          // random option of twemoji
          else res.url = helper.cache.parseTwemoji(Emoji.random().emoji)
          // change up the args
          args = ['hole', 'random']
        } else {
          res = {}
          res.url = url
        }
        if (res) {
          const file = path.resolve(`./download/${Date.now()}`)
          const imgOpts = {
            url: res.url,
            dest: file,
            extractFilename: false,
            timeout: 1000
          }
          let options = []
          let argLc
          if ((args.length > 1)) argLc = args[1].toLowerCase()
          else argLc = args[0].toLowerCase()
          if (argLc === 'random' || argLc === 'r') {
            // random effects option
            random = true
            const optLen = Pand.random(2, 30)
            for (let i = 0; i < optLen; i++) {
              options.push(Pand.choice(effects))
            }
          } else {
            // parse command arguments now, anything after the emote name
            options = args.slice(1, 30)
            random = false
          }
          // download the image
          download.image(imgOpts)
            .then((_) => {
              FileType.fromFile(file).then(ft => {
                const img = gm(file)
                // process image effects
                options.forEach(option => {
                  switch (option) {
                    case 'blur':
                      img.blur(Pand.randomFloat(0.1, 2))
                      break
                    case 'charcoal':
                      img.charcoal(Pand.randomFloat(0, 5))
                      break
                    case 'cycle':
                      img.cycle(Pand.random(1, 10))
                      break
                    case 'edge':
                      img.edge(Pand.randomFloat(0.1, 4))
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
                      img.median()
                      break
                    case 'minify':
                      img.minify(Pand.random(1, 10))
                      break
                    case 'monochrome':
                      img.monochrome()
                      break
                    case 'mosaic':
                      img.mosaic()
                      break
                    case 'motionblur':
                      img.motionBlur(0, 2, Pand.random(0, 360))
                      break
                    case 'noise':
                      img.noise('uniform')
                      break
                    case 'normalize':
                      img.normalize()
                      break
                    case 'paint':
                      img.paint(Pand.randomFloat(0.1, 5))
                      break
                    case 'roll':
                      img.roll(Pand.randomIndex(-10, 10), Pand.randomIndex(-10, 10))
                      break
                    case 'rotate':
                      img.rotate('white', Pand.random(-360, 360))
                      break
                    case 'sepia':
                      img.sepia()
                      break
                    case 'shave':
                      img.shave(20, 20, 5)
                      break
                    case 'sharpen':
                      img.sharpen(Pand.randomFloat(0.1, 5))
                      break
                    case 'solarize':
                      img.solarize(Pand.randomFloat(0, 100))
                      break
                    case 'spread':
                      img.spread(Pand.randomFloat(0, 100))
                      break
                    case 'swirl':
                      img.swirl(5)
                      break
                    case 'threshold':
                      img.threshold(Pand.random(1, 20))
                      break
                    case 'trim':
                      img.trim()
                      break
                    case 'wave':
                      img.wave(Pand.randomFloat(0.1, 10), Pand.randomFloat(0.1, 10))
                      break
                  }
                })
                img.toBuffer(ft.ext, (err, buff) => {
                  if (err) {
                    const errEmbed = cmdHelper.imgErr(err, helper, message.author)
                    console.error(err)
                    return message.reply(errEmbed)
                  }
                  // now we send out the message
                  const attach = new Discord.MessageAttachment(buff, `${Date.now()}.${ft.ext}`)
                  message.channel.stopTyping(true)
                  if (Date.now() - cmdStart > 30000) {
                    // if a command takes more than 30 seconds to process, we ping the user when its done
                    message.channel.send(`${message.author}, your image has finished processing!`)
                  }
                  let effects = ''
                  if (random) effects = `Effects chain used: ${options.join(' ')}`
                  // send out the effects chain
                  message.channel.send(effects, attach).then(msg => {
                    // add delete reacts and save a reference to the creator of the original
                    // msg so users cant delete other users images
                    msg.react('🗑️')
                    helper.rescaleMsgs[msg.id] = message.author.id
                  })
                  // delete the source file
                  fs.unlink(file, (err) => {
                    if (err) console.error(err)
                  })
                })
              })
            })
          /*  // queue up a worker to run
          helper.pool.exec('editImage', [res.url, options])
            .then(result => {f
              // send out the resulting image as a Discord attachment
              // convert it to a node buffer
              message.channel.stopTyping(true)
              const attach = new Discord.MessageAttachment(Buffer.from(result), 'most_likely_blursed.png')
              message.channel.send(attach)
              if (random) {
              // send out the effects chain
                message.channel.send(`Effects chain used: ${options.join(' ')}`)
              }
            })
            .catch(error => console.error(error)) */
        } else {
          message.reply('emote not found!')
        }
      }
      message.channel.stopTyping(true)
    })
  }
}
