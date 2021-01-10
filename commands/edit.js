const Discord = require('discord.js')
const Jimp = require('jimp')
const Pand = require('pandemonium')

module.exports = {
  name: 'edit',
  description: 'Edits an emote according to the effects you select. Effects are applied in the order you specify them. Animated emotes will return static images sadly :(',
  usage: '[edit] <emote> (opt args): <random/r> <sharpen/sh> <edge_detect/ed> <emboss/em> <grayscale/gs> <blur/bl> <posterize/p> <sepia/sp> <rotate/rt> <scale/sc>.',
  aliases: ['ed', 'modify'],
  cooldown: 3,
  execute (message, args, client, helper) {
    console.log('edit used')
    let random
    if (args.length < 2) {
      message.reply(`You must specify an emote name and filters in the command! \n \`${this.usage}\``)
    } else {
      const emoteName = args[0].toLowerCase()
      let res = helper.cache.retrieve(emoteName)
      // since we implement a longer cooldown, we autofill for the first emote we find from search
      // TODO: move into helper class
      if (!res) {
        const searchRes = helper.cache.search(args[0])
        if (searchRes.length !== 0) {
          res = searchRes[0].item
        }
      }
      if (res) {
        let opts = []
        if ((args.length > 0 && args[1].toLowerCase() === 'random') || args[1].toLowerCase() === 'r') {
          // random effects option
          random = true
          const optLen = Pand.random(1, 10)
          const effects = ['sharpen', 'emboss', 'grayscale', 'blur', 'posterize', 'sepia', 'rotate', 'scale']
          for (let i = 0; i < optLen; i++) {
            opts.push(Pand.choice(effects))
          }
        } else {
          // parse command arguments now, anything after the emote name
          opts = args.slice(1, 20)
          random = false
        }

        // limit the amount of commands that can be performed at once since this runs synchronously
        Jimp.read(res.url).then(emote => {
          // convolution info https://docs.gimp.org/2.6/en/plug-in-convmatrix.html
          if (emote.bitmap.width > 250 || emote.bitmap.height > 250) {
            emote.scale(0.4)
          }
          let scaleAmts = 0
          opts.forEach(option => {
            switch (option) {
              // let the user use shorter aliases that fall through
              case 'em':
              case 'emboss':
                emote.convolute([[-2, -1, 0], [-1, 1, 1], [0, 1, 2]])
                break
              case 'ed':
              case 'edge_detect':
                emote.convolute([[0, 1, 0], [1, -4, 1], [0, 1, 0]])
                break
              case 'sh':
              case 'sharpen':
                emote.convolute([[0, 0, 0, 0, 0], [0, 0, -1, 0, 0], [0, -1, 5, -1, 0], [0, 0, -1, 0, 0], [0, 0, 0, 0, 0]])
                break
              case 'gs':
              case 'grayscale':
                emote.grayscale()
                break
              case 'bl':
              case 'blur':
                emote.blur(Pand.random(1, 5))
                break
              case 'p':
              case 'posterize':
                emote.posterize(Pand.random(1, 5))
                break
              case 'sp':
              case 'sepia':
                emote.sepia()
                break
                // limit the number of scales to preserve memory
              case 'rt':
              case 'rotate':
                if (scaleAmts < 6) {
                  emote.rotate(Pand.random(-360, 360))
                  scaleAmts++
                }
                break
              case 'sc':
              case 'scale':
                if (scaleAmts < 6) {
                  emote.scale(Pand.randomFloat(0.1, 2))
                  scaleAmts++
                }
                break
            }
            emote.resize(275, 275)
          }
          )
          emote.getBufferAsync(Jimp.AUTO).then(buf => {
            const attach = new Discord.MessageAttachment(buf, 'most_likely_blursed.png')
            message.channel.send(attach)
            if (random) {
              // send out the effects chain
              message.channel.send(`Effects chain used: ${opts.join(', ')}`)
            }
          })
            .catch(reason => console.log(reason))
        })
          .catch(reason => console.log(reason))
      } else {
        message.reply('emote not found!')
      }
    }
  }
}
