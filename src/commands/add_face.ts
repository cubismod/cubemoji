import { Cubemoji } from '../types/cubemoji/cubemoji'
import Discord = require('discord.js')
import CommandHelper = require('./../command-helper')
import { ExtMsg } from '../extended-msg'

export class AddFace implements Cubemoji.Command {
  name = 'add_face'
  description = 'Adds a face or...other to an avatar or emote. Animated emotes/avatars will return static images. https=//gitlab.com/cubismod/cubemoji/-/wikis/commands/add_face'
  usage = 'add_face <emote/@mention> (opt args)= <flushed> <jfc> <joy> <pensive> <plead> <thinking> <triumph> <weary> <zany>; (opt)= <attachment image>'
  aliases = ['af', 'addflush']
  cooldown = 1

  execute (message: Discord.Message, args: string[], client: Discord.Client, util: Cubemoji.Util) {
    CommandHelper.checkImage(message, args, client, util).then(url => {
      const extMsg = new ExtMsg(message)
      if (!url) {
        console.log(`${message.author.username} failed to use ${this.name} correctly`)
        // figure out inline replies
        extMsg.inlineReply(`You must specify an emote/mention in the command! \nusage: \`${this.usage}\``)
      } else {
        const res = {
          url: ''
        }
        res.url = url
        if (res) {
          // determine the face specified, default to flushed if none found
          let path = './assets/flushed.png'
          const opts = ['jfc', 'joy', 'pensive', 'plead', 'thinking', 'triumph', 'weary', 'zany', 'flushed']
          // do a search through arguments to see if we can find a face to use
          args.forEach(element => {
            if (opts.includes(element.toLowerCase())) {
              path = `./assets/${element.toLowerCase()}.png`
            }
          })
          // queue up another worker to run the image edit
          util.pool.exec('addFace', [res.url, path])
            .then(result => {
              // automatically spoiler 'jfc' images
              let fileName
              if (path.includes('jfc')) fileName = 'SPOILER_face.png'
              else fileName = 'face.png'
              const attach = new Discord.MessageAttachment(Buffer.from(result), fileName)
              message.channel.stopTyping(true)
              message.channel.send(attach)
            })
            .catch(error => console.log(error))
        } else {
          extMsg.inlineReply('emote not found!')
        }
      }
      message.channel.stopTyping(true)
    })
      .catch(err => {
      // the checkImage func failed
        console.error(err)
      })
  }
}
