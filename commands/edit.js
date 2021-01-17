const Discord = require('discord.js')
const Pand = require('pandemonium')

module.exports = {
  name: 'edit',
  description: 'Edits an emote/avatar according to the effects you select. Effects are applied in the order you specify them. Animated emotes will return static images. This process is computationally intense so give it a few seconds to work.',
  usage: '[edit] <emote/@mention> (opt args): <random/r> <sharpen/sh> <edge_detect/ed> <emboss/em> <grayscale/gs> <blur/bl> <posterize/p> <sepia/sp> <rotate/rt> <scale/sc>.',
  aliases: ['ed', 'modify'],
  cooldown: 1,
  execute (message, args, client, helper) {
    // console.log('edit used')
    let random
    if (args.length < 2) {
      message.reply(`You must specify an emote name and filters in the command! \n \`${this.usage}\``)
    } else {
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
        // TODO: move into helper class
        if (!res) {
          const searchRes = helper.cache.search(args[0])
          if (searchRes.length !== 0) {
            res = searchRes[0].item
          }
        }
      }
      if (res) {
        let options = []
        if ((args.length > 0 && args[1].toLowerCase() === 'random') || args[1].toLowerCase() === 'r') {
          // random effects option
          random = true
          const optLen = Pand.random(1, 10)
          const effects = ['sharpen', 'emboss', 'grayscale', 'blur', 'posterize', 'sepia', 'rotate', 'scale']
          for (let i = 0; i < optLen; i++) {
            options.push(Pand.choice(effects))
          }
        } else {
          // parse command arguments now, anything after the emote name
          options = args.slice(1, 20)
          random = false
        }
        message.react('<a:dieRoll:795419079254605834>')
        // queue up a worker to run
        helper.pool.exec('editImage', [res.url, options])
          .then(result => {
            // send out the resulting image as a Discord attachment
            // convert it to a node buffer
            const attach = new Discord.MessageAttachment(Buffer.from(result), 'most_likely_blursed.png')
            message.channel.send(attach)
            if (random) {
            // send out the effects chain
              message.channel.send(`Effects chain used: ${options.join(' ')}`)
            }
          })
          .catch(error => console.log(error))
      } else {
        message.reply('emote not found!')
      }
    }
  }
}
