const cmdHelper = require('./../command-helper')
const download = require('image-downloader')
const Pandemonium = require('pandemonium')
const Discord = require('discord.js')
const fs = require('fs')
const path = require('path')
const gm = require('gm').subClass({ imageMagick: true })
const FileType = require('file-type')
require('./../extended-msg')

// note that this file requires imagemagick installed on the host os
// TODO: add image throttling so we don't blast the CPU
module.exports = {
  name: 'rescale',
  description: 'Rescale an image using Seam carving to humorous results https://en.wikipedia.org/wiki/Seam_carving. This command supports editing attachments. https://gitlab.com/cubismod/cubemoji/-/wikis/commands/rescale',
  usage: 'rescale <emote,@mention,image url(png/gif/jpg/jpeg)> (opt): <attachment image>',
  aliases: ['liquid', 'cas', 'content-scale', 'rs'],
  cooldown: 2,
  execute (message, args, client, helper, blame) {
    cmdHelper.checkImage(message, args, client, helper).then(emote => {
      message.channel.startTyping()
      if (!emote) {
        // no image or emote found
        console.log(`${message.author.username} failed to use ${this.name} correctly`)
        return message.inlineReply(`you must specify an emote or attachment \n \`${this.usage}\``)
      }
      // indicate to the user that we are actually working
      message.channel.startTyping()
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
                  return message.inlineReply(errEmbed)
                }
                // now we send out the message
                const attach = new Discord.MessageAttachment(buff, `${Date.now()}.${ft.ext}`)
                message.channel.stopTyping(true)
                message.inlineReply(attach).then(msg => {
                // add delete reacts and save a reference to the creator of the original
                  // msg so users cant delete other users images
                  // if this command is intiated through a react, then the person who reacted has the ability to delete the image, therefore we need to save a reference to them instead of the image creator
                  if (blame !== undefined) {
                    helper.rescaleMsgs[msg.id] = blame
                  } else {
                    helper.rescaleMsgs[msg.id] = message.author.id
                  }
                  msg.react('🗑️')
                })
                  .catch(err => console.error(err))
                // delete the source file
                fs.unlink(file, (err) => {
                  if (err) console.error(err)
                })
              })
          })
            .catch(err => {
              const errEmbed = cmdHelper.imgErr(err, helper, message.author)
              console.error(err)
              return message.inlineReply(errEmbed)
            })
        })
        .catch(err => {
          const errEmbed = cmdHelper.imgErr(err, helper, message.author)
          console.error(err)
          return message.inlineReply(errEmbed)
        })
    })
  }
}
