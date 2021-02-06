const Discord = require('discord.js')
const Pand = require('pandemonium')
const Emoji = require('node-emoji')
module.exports = {
  name: 'edit',
  description: 'Edits an emote/avatar according to the effects you select. Effects are applied in the order you specify them. Animated emotes will return static images. This process is computationally intense so give it a few seconds to work.',
  usage: '[edit] <emote/@mention> (opt args): <random/r> <sharpen/sh> <edge_detect/ed> <emboss/em> <grayscale/gs> <blur/bl> <sepia/sp> <rightrotate/rtro> <lfro/leftrotate> <scaleup/scup> <scaledown/scdn>, <flip/fl>, <upsidedown/ud>.',
  aliases: ['ed', 'modify'],
  cooldown: 1,
  execute (message, args, client, helper) {
    let random
    if (args.length < 2 && (args.length !== 1 && args[0] !== 'hole')) {
      message.reply(`You must specify an emote name and filters in the command! \n \`${this.usage}\``)
    } else {
      message.channel.startTyping()
      const argName = args[0].toLowerCase()
      let res
      if (argName === 'hole') {
        res = {}
        // easter egg time
        if (Pand.choice([true, false])) res = Pand.choice(helper.cache.createEmoteArray())
        // random option of twemoji
        else res.url = helper.cache.parseTwemoji(Emoji.random().emoji)
        // change up the args
        args = ['hole', 'random']
      } else {
        // check if its a mention and then only get
      // the numeric part of the mention code
        const avatarUrl = helper.cache.getAvatar(argName, client)
        const twemoji = helper.cache.parseTwemoji(argName)
        res = {}
        if (avatarUrl || twemoji) {
          if (avatarUrl) res.url = avatarUrl
          else res.url = twemoji.url
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
      }
      if (res) {
        let options = []
        let argLc
        if ((args.length > 1)) argLc = args[1].toLowerCase()
        if (argLc === 'random' || argLc === 'r') {
          // random effects option
          random = true
          const optLen = Pand.random(2, 30)
          const effects = ['sharpen', 'emboss', 'grayscale', 'blur', 'sepia', 'rightrotate', 'leftrotate', 'scaleup', 'scaledown', 'flip', 'upsidedown']
          for (let i = 0; i < optLen; i++) {
            options.push(Pand.choice(effects))
          }
        } else {
          // parse command arguments now, anything after the emote name
          options = args.slice(1, 30)
          random = false
        }
        // queue up a worker to run
        helper.pool.exec('editImage', [res.url, options])
          .then(result => {
            // send out the resulting image as a Discord attachment
            // convert it to a node buffer
            message.channel.stopTyping(true)
            const attach = new Discord.MessageAttachment(Buffer.from(result), 'most_likely_blursed.png')
            message.channel.send(attach)
            if (random) {
            // send out the effects chain
              message.channel.send(`Effects chain used: ${options.join(' ')}`)
            }
          })
          .catch(error => console.error(error))
      } else {
        message.reply('emote not found!')
      }
    }
    message.channel.stopTyping(true)
  }
}
