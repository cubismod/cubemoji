const Discord = require('discord.js')

module.exports = {
  name: 'add_flush',
  description: 'Returns a flushed version of an emote. Animated emotes will return static images sadly :(',
  usage: '[add_flush] <emote_name/emote>',
  aliases: ['af', 'addflush'],
  cooldown: 10,
  requiresCache: true,
  execute (message, args, client, cache) {
    console.log('add_flush used')
    if (args.length < 1) {
      message.reply('You must specify an emote name in the command!')
    } else {
      const emoteName = args[0].toLowerCase()
      let res = cache.retrieve(emoteName)
      // since we implement a longer cooldown, we autofill for the first emote we find from search
      if (!res) {
        res = cache.search(args[0])[0].item
      }
      if (res) {
        const Jimp = require('jimp')
        Jimp.read('./assets/flushed.png').then(flush => {
          Jimp.read(res.url).then(baseEmote => {
            baseEmote.composite(flush, 0, 0, { mode: Jimp.BLEND_SOURCE_OVER })
            baseEmote.getBufferAsync(Jimp.AUTO).then(buf => {
              const attach = new Discord.MessageAttachment(buf, 'flush.png')
              message.channel.send(attach)
            })
              .catch(reason => console.log(reason))
          })
            .catch(reason => console.log(reason))
        })
          .catch(reason => console.log(reason))

        // if we find a match then let's begin flushing
        /* const { createCanvas, loadImage } = require('canvas')
        const canv = createCanvas(128, 128) // discord emotes are 128x128 px
        const baseEmoji = loadImage(res.url)
        const ctx = canv.getContext('2d')
        if (args.length > 1 && args[1].toLowerCase() === 'invert') {
          ctx.globalCompositeOperation = 'destination-atop'
        }

        baseEmoji.then((emoji) => {
          ctx.drawImage(emoji, 0, 0, canv.width, canv.height)
          // then we overlay the flush
          const flush = loadImage('./assets/flushed.png')
          flush.then((emoji) => {
            ctx.drawImage(emoji, 0, 0, canv.width, canv.height)

            const attach = new Discord.MessageAttachment(canv.toBuffer(), 'flush.png')
            message.channel.send(attach)
          })
        })
        baseEmoji.catch((reason) => {
          console.log(reason)
        }) */
      } else {
        message.reply('emote not found!')
      }
    }
  }
}
