const cmdHelper = require('./../command-helper')
const download = require('image-downloader')
const Pandemonium = require('pandemonium')
const Discord = require('discord.js')
const fs = require('fs')
const path = require('path')
const im = require('imagemagick')
const FileType = require('file-type')

// note that this file requires imagemagick installed on the host os
module.exports = {
  name: 'rescale',
  description: 'Rescale an image using Seam carving to humorous results https://en.wikipedia.org/wiki/Seam_carving. This command supports editing attachments.',
  usage: '[rescale] (opt): <attachment image>',
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
    // if we have a guildemoji object, we need to pull the URL from it
    if (emote.url !== undefined) emote = emote.url
    // now try to download the file
    const file = path.resolve(`./download/${Date.now()}`)
    const options = {
      url: emote,
      dest: file,
      extractFilename: false
    }
    download.image(options)
      .then((fn) => {
        // we then save our image
        // console.log('saved to:', filename)
        // then lets build an edit string
        const xSize = Pandemonium.random(128, 800)
        const ySize = Pandemonium.random(128, 800)
        const args = [file, '-liquid-rescale', `${xSize}x${ySize}`, `${file}n`]
        im.convert(args, (err) => {
          if (err) {
            // let the user know there was an error processing that image
            const sadEmote = Pandemonium.choice(helper.cache.search('sad')).item
            const errEmbed = new Discord.MessageEmbed()
              .setColor('RED')
              .setTitle(`${sadEmote} an error occurred when processing your image!`)
              .setDescription(`${message.author} Your image may have been too large or an unsupported file type causing the rescale to fail. See technical details below`)
              .addFields(
                { name: 'Error Details', value: `\`\`\`${err}\`\`\`` }
              )
            console.log(err)
            return message.reply(errEmbed)
          }
          // console.log(stdout)
          fs.readFile(`${file}n`, (err, data) => {
            if (err) {
              console.error(err)
              return
            }
            FileType.fromBuffer(data).then(ft => {
              // now we send that message out w/ the proper file type
              const attach = new Discord.MessageAttachment(data, `${Date.now()}.${ft.ext}`)
              message.channel.stopTyping(true)
              message.channel.send(attach)
              // delete those files from mem
              fs.unlink(file, (err) => {
                if (err) console.error(err)
              })
              fs.unlink(`${file}n`, (err) => {
                if (err) console.error(err)
              })
            })
          })
        })
      })
      .catch(err => console.error(err))
  }
}
