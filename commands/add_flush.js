const Discord = require('discord.js')
const Jimp = require('jimp')

module.exports = {
  name: 'add_flush',
  description: 'Returns a flushed version of an emote. Animated emotes will return static images sadly :(',
  usage: '[add_flush] <emote_name/emote>',
  aliases: ['af', 'addflush'],
  cooldown: 5,
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
        const searchRes = cache.search(args[0])
        if (searchRes.length !== 0) {
          res = searchRes[0].item
        }
      }
      if (res) {
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
      } else {
        message.reply('emote not found!')
      }
    }
  }
}
