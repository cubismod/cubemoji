const cmdHelper = require('./../command-helper')
const download = require('image-downloader')
const Pandemonium = require('pandemonium')
const Discord = require('discord.js')
const fs = require('fs')
const path = require('path')
const gm = require('gm').subClass({ imageMagick: true })
const FileType = require('file-type')

// note that this file requires imagemagick installed on the host os
module.exports = {
  name: 'rescale',
  description: 'Rescale an image using Seam carving to humorous results https://en.wikipedia.org/wiki/Seam_carving. This command supports editing attachments. https://gitlab.com/cubismod/cubemoji/-/wikis/commands/rescale',
  usage: 'rescale <emote,@mention> (opt): <attachment image>',
  aliases: ['liquid', 'cas', 'content-scale', 'rs'],
  cooldown: 2,
  execute (message, args, client, helper) {
    let emote = cmdHelper.checkImage(message, args, client, helper)
    if (!emote) {
      // no image or emote found
      console.log(`${message.author.username} failed to use ${this.name} correctly`)
      return message.reply(`you must specify an emote or attachment \n \`${this.usage}\``)
    }
    // indicate to the user that we are actually working
    message.channel.startTyping()
    const cmdStart = Date.now()
    // if we have a guildemoji object, we need to pull the URL from it
    if (emote.url !== undefined) emote = emote.url
    // now try to download the file
    const file = path.resolve(`./download/${Date.now()}`)
    const options = {
      url: emote,
      dest: file,
      extractFilename: false,
      timeout: 1000
    }
    download.image(options)
      .then((_) => {
        // we then save our image
        // console.log('saved to:', filename)
        // then lets build an edit string
        let newSize
        switch (Pandemonium.random(0, 2)) {
          case 0:
            // set a width
            newSize = Pandemonium.random(10, 1000).toString()
            break
          case 1:
            // set a height
            newSize = `x${Pandemonium.random(10, 1000)}`
            break
          case 2:
            // ignore aspect ratio
            newSize = `${Pandemonium.random(10, 1000)}x${Pandemonium.random(10, 1000)}!`
        }
        // get the file type of the image file
        FileType.fromFile(file).then(ft => {
          gm(file)
            .out('-liquid-rescale', newSize)
            .toBuffer(ft.ext, (err, buff) => {
              if (err) {
                const errEmbed = cmdHelper.imgErr(err, helper, message.author)
                console.error(err)
                return message.reply(errEmbed)
              }
              // now we send out the message
              const attach = new Discord.MessageAttachment(buff, `${Date.now()}.${ft.ext}`)
              message.channel.stopTyping(true)
              if (Date.now() - cmdStart > 30000) {
              // if a command takes more than 30 seconds to process, we ping the user when its done
                message.channel.send(`${message.author}, your image has finished processing!`)
              }
              message.channel.send(attach).then(msg => {
              // add delete reacts and save a reference to the creator of the original
              // msg so users cant delete other users images
                msg.react('🗑️')
                helper.rescaleMsgs[msg.id] = message.author.id
              })
              // delete the source file
              fs.unlink(file, (err) => {
                if (err) console.error(err)
              })
            })
        })
          .catch(err => {
            const errEmbed = cmdHelper.imgErr(err, helper, message.author)
            console.error(err)
            return message.reply(errEmbed)
          })
      })
  }
}
