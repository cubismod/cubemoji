const { spawn } = require('child_process')
const cmdHelper = require('./../command-helper')
const download = require('image-downloader')
const Pandemonium = require('pandemonium')
const Discord = require('discord.js')
const fs = require('fs')
const path = require('path')

// note that this file requires imagemagick installed on the host os
module.exports = {
  name: 'rescale',
  description: 'Rescale an image using Seam carving to humorous results https://en.wikipedia.org/wiki/Seam_carving. This command supports editing attachments.',
  usage: '[rescale] (opt): <attachment image>',
  aliases: ['liquid', 'cas', 'content-scale', 'rs'],
  cooldown: 10,
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
      .then((filename) => {
        // we then save our image
        console.log('saved to:', filename)
        // then lets build an edit string
        const xSize = Pandemonium.random(50, 400)
        const ySize = Pandemonium.random(50, 400)
        const cmd = `magick ${file} -liquid-rescale ${xSize}x${ySize} ${file}n`
        const child = spawn(cmd)
        child.stdout.on('data', data => console.log(data))
        child.on('error', err => console.error(err))
        child.on('close', (code, signal) => {
          fs.readFile(`${file}n`, (err, data) => {
            if (err) throw err
            // now we send that message out
            const attach = new Discord.MessageAttachment(data)
            message.channel.send(attach)
          })
        })
      })
      .catch(err => console.error(err))
  }
}
