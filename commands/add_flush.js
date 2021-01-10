const Discord = require('discord.js')

module.exports = {
  name: 'add_flush',
  description: 'Returns a flushed version of an emote. Animated emotes will return static images. This process is computationally intense so give it a few seconds to work.',
  usage: '[add_flush] <emote>',
  aliases: ['af', 'addflush'],
  cooldown: 1,
  execute (message, args, client, helper) {
    console.log('add_flush used')
    if (args.length < 1) {
      message.reply(`You must specify an emote in the command! \n \`${this.usage}\``)
    } else {
      const emoteName = args[0].toLowerCase()
      let res = helper.cache.retrieve(emoteName)
      // since we implement a longer cooldown, we autofill for the first emote we find from search
      if (!res) {
        const searchRes = helper.cache.search(args[0])
        if (searchRes.length !== 0) {
          res = searchRes[0].item
        }
      }
      if (res) {
        message.react('<a:dieRoll:795419079254605834>')
        // queue up another worker to run the image edit
        helper.pool.exec('addFlush', [res.url])
          .then(result => {
            const attach = new Discord.MessageAttachment(Buffer.from(result), 'flushed.png')
            message.channel.send(attach)
          })
          .catch(error => console.log(error))
      } else {
        message.reply('emote not found!')
      }
    }
  }
}
