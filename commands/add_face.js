const Discord = require('discord.js')

module.exports = {
  name: 'add_face',
  description: 'Adds a face or...other to an avatar or emote. Animated emotes/avatars will return static images.',
  usage: '[add_face] <emote/@mention> (opt args): <jfc> <joy> <pensive> <plead> <thinking> <triumph> <weary> <zany>',
  aliases: ['af', 'addflush'],
  cooldown: 1,
  execute (message, args, client, helper) {
    if (args.length < 1) {
      message.reply(`You must specify an emote/mention in the command! \nusage: \`${this.usage}\``)
    } else {
      // start a typing indicator to show we're working
      message.channel.startTyping()
      const argName = args[0].toLowerCase()
      // check if its a mention and then only get
      // the numeric part of the mention code
      const avatarUrl = helper.cache.getAvatar(argName, client)
      const twemoji = helper.cache.parseTwemoji(argName)
      let res = {}
      if (avatarUrl || twemoji) {
        if (avatarUrl) res.url = avatarUrl
        else res.url = twemoji.url
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
        // determine the face specified, default to flushed if none found
        let path = './assets/flushed.png'
        const opts = ['jfc', 'joy', 'pensive', 'plead', 'thinking', 'triumph', 'weary', 'zany']
        if (args.length >= 2 && opts.includes(args[1].toLowerCase())) path = `./assets/${args[1].toLowerCase()}.png`
        // queue up another worker to run the image edit
        helper.pool.exec('addFace', [res.url, path])
          .then(result => {
            const attach = new Discord.MessageAttachment(Buffer.from(result), 'face.png')
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
