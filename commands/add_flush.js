const Discord = require('discord.js')

module.exports = {
  name: 'add_flush',
  description: 'Returns a flushed version of an emote',
  usage: '[add_flush] <emote_name/emote>',
  aliases: ['af'],
  requiresCache: true,
  execute (message, args, client, cache) {
    console.log('add_flush used')
    if (args.length < 1) {
      message.reply('You must specify an emote name in the command!')
    } else {
      const emoteName = args[0].toLowerCase()
      let res = cache.retrieve(emoteName)
      if (res) {
        // if we find a match then let's begin flushing
        const { createCanvas, loadImage } = require('canvas')
        const canv = createCanvas(128, 128) // discord emotes are 128x128 px
        const baseEmoji = loadImage(res.url)
        const ctx = canv.getContext('2d')

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
        })
      } else {
        // retrieve a result from the cache
        res = cache.search(args[0])
        if (res.length > 0) {
          message.reply(`emote not found! Maybe try ${res[0].item} - \`${res[0].item.name}\`?`)
        } else {
          message.reply('emote not found!')
        }
      }
    }
  }
}
