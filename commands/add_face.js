const Discord = require('discord.js')

module.exports = {
  name: 'add_face',
  description: 'Adds a face or...other to an avatar or emote. Animated emotes/avatars will return static images.',
  usage: '[add_face] <emote/@mention> (opt args): <jfc> <joy> <pensive> <plead> <thinking> <triumph> <weary> <zany>',
  aliases: ['af', 'addflush'],
  cooldown: 1,
  execute (message, args, client, helper) {
    const cmdHelper = require('./../command-helper')
    const url = cmdHelper.checkImage(message, args, client, helper)
    if (!url) {
      console.log(`${message.author.username} failed to use ${this.name} correctly`)
      message.reply(`You must specify an emote/mention in the command! \nusage: \`${this.usage}\``)
    } else {
      const res = {}
      res.url = url
      if (res) {
        // determine the face specified, default to flushed if none found
        let path = './assets/flushed.png'
        const opts = ['jfc', 'joy', 'pensive', 'plead', 'thinking', 'triumph', 'weary', 'zany']
        // TODO: fix attachments here
        if (args.length === 1 && opts.includes(args[0].toLowerCase())) path = `./assets/${args[0].toLowerCase()}.png`
        else path = `./assets/${args[1].toLowerCase()}.png`
        // queue up another worker to run the image edit
        helper.pool.exec('addFace', [res.url, path])
          .then(result => {
            // automatically spoiler 'jfc' images
            let fileName
            if (args[1].toLowerCase() === 'jfc') fileName = 'SPOILER_face.png'
            else fileName = 'face.png'
            const attach = new Discord.MessageAttachment(Buffer.from(result), fileName)
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
