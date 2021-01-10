const Discord = require('discord.js')

module.exports = {
  name: 'add_flush',
  description: 'Returns a flushed version of an emote. Animated emotes will return static images sadly :(',
  usage: '[add_flush] <emote>',
  aliases: ['af', 'addflush'],
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
