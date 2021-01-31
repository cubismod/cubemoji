const Discord = require('discord.js')

module.exports = {
  name: 'add_flush',
  description: 'Returns a flushed version of an emote/avatar. Animated emotes/avatars will return static images. This process is computationally intense so give it a few seconds to work.',
  usage: '[add_flush] <emote/@mention>',
  aliases: ['af', 'addflush'],
  cooldown: 1,
  execute (message, args, client, helper) {
    if (args.length < 1) {
      message.reply(`You must specify an emote in the command! \nusage: \`${this.usage}\``)
    } else {
      // start a typing indicator to show we're working
      message.channel.startTyping()
      const argName = args[0].toLowerCase()
      // check if its a mention and then only get
      // the numeric part of the mention code
      const avatarUrl = helper.cache.getAvatar(argName, client)
      let res = {}
      if (avatarUrl) {
        res.url = avatarUrl
      } else {
        res = helper.cache.retrieve(argName)
        // since we implement a longer cooldown, we autofill for the first emote we find from search
        if (!res) {
          const searchRes = helper.cache.search(args[0])
          if (searchRes.length !== 0) {
            res = searchRes[0].item
          }
        }
      }
      if (res) {
        // queue up another worker to run the image edit
        helper.pool.exec('addFlush', [res.url])
          .then(result => {
            const attach = new Discord.MessageAttachment(Buffer.from(result), 'flushed.png')
            message.channel.stopTyping(true)
            message.channel.send(attach)
          })
          .catch(error => console.log(error))
      } else {
        message.reply('emote not found!')
      }
    }
    message.channel.stopTyping(true)
  }
}
