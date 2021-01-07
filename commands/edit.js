const Discord = require('discord.js')
const Jimp = require('jimp')
const Pand = require('pandemonium')

module.exports = {
  name: 'edit',
  description: 'Edits an emote according to the effects you select. Effects are applied in the order you specify them. Animated emotes will return static images sadly :(',
  usage: '[edit] <emote_name/emote> (optional) <random/r> (optional and you can select multiple)<sharpen/sh> <edge_detect/ed> <emboss/em> <grayscale/gs> <blur/bl> <posterize/p> <sepia/sp> <pixelate/pi>',
  aliases: ['ed', 'modify'],
  cooldown: 5,
  requiresCache: true,
  execute (message, args, client, cache) {
    console.log('edit used')
    if (args.length < 1) {
      message.reply('You must specify an emote name and filters in the command! Use `c!help edit` for info on how to use this command.')
    } else {
      const emoteName = args[0].toLowerCase()
      let res = cache.retrieve(emoteName)
      // since we implement a longer cooldown, we autofill for the first emote we find from search
      // TODO: move into helper class
      if (!res) {
        const searchRes = cache.search(args[0])
        if (searchRes.length !== 0) {
          res = searchRes[0].item
        }
      }
      if (res) {
        let opts = []
        if (args[1].toLowerCase() === 'random' || args[1].toLowerCase() === 'r') {
          // random effects option
          const optLen = Pand.random(1, 21)
          const effects = ['sh', 'ed', 'em', 'gs', 'bl', 'p', 'sp', 'pi']
          for (let i = 0; i < optLen; i++) {
            opts.push(Pand.choice(effects))
          }
        } else {
          // parse command arguments now, anything after the emote name
          opts = args.slice(1, 20)
        }

        // limit the amount of commands that can be performed at once since this runs synchronously
        Jimp.read(res.url).then(emote => {
          // convolution info https://docs.gimp.org/2.6/en/plug-in-convmatrix.html
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
                emote.blur(1)
                break
              case 'p':
              case 'posterize':
                emote.posterize(5)
                break
              case 'sp':
              case 'sepia':
                emote.sepia()
                break
              case 'pi':
              case 'pixelate':
                emote.pixelate(4)
                break
            }
          })
          emote.getBufferAsync(Jimp.AUTO).then(buf => {
            const attach = new Discord.MessageAttachment(buf, 'edit.png')
            message.channel.send(attach)
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
