const Discord = require('discord.js')
const Pand = require('pandemonium')
const Emoji = require('node-emoji')
module.exports = {
  name: 'edit',
  description: 'Edits an emote/avatar according to the effects you select. Effects are applied in the order you specify them. Animated emotes will return static images. This process is computationally intense so give it a few seconds to work. https://gitlab.com/cubismod/cubemoji/-/wikis/commands/modify',
  usage: 'edit <emote/@mention> (opt args): <random/r> <sharpen/sh> <edge_detect/ed> <emboss/em> <grayscale/gs> <blur/bl> <sepia/sp> <rightrotate/rtro> <lfro/leftrotate> <scaleup/scup> <scaledown/scdn>, <flip/fl>, <upsidedown/ud>; (opt): <attachment image>',
  aliases: ['ed', 'modify'],
  cooldown: 1,
  execute (message, args, client, helper) {
    const cmdHelper = require('./../command-helper')
    let random
    cmdHelper.checkImage(message, args, client, helper).then(url => {
      if (!url && (args.length !== 1 && args[0] !== 'hole')) {
        console.log(`${message.author.username} failed to use ${this.name} correctly`)
        message.reply(`You must specify an emote name and filters in the command! \n \`${this.usage}\``)
      } else {
        let res
        if (args[0].toLowerCase() === 'hole') {
          res = {}
          // easter egg time
          if (Pand.choice([true, false])) res = Pand.choice(helper.cache.createEmoteArray())
          // random option of twemoji
          else res.url = helper.cache.parseTwemoji(Emoji.random().emoji)
          // change up the args
          args = ['hole', 'random']
        } else {
          res = {}
          res.url = url
        }
        if (res) {
          let options = []
          let argLc
          if ((args.length > 1)) argLc = args[1].toLowerCase()
          else argLc = args[0].toLowerCase()
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
    })
  }
}
