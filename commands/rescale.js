module.exports = {
  name: 'rescale',
  description: 'Rescale an image using Seam carving to humorous results https://en.wikipedia.org/wiki/Seam_carving. This command supports editing attachments.',
  usage: '[rescale] (opt): <emote/mention> <x-scale: -1 to 1> <y-scale: -1 to 1>; (opt): <attachment image>',
  aliases: ['liquid', 'cas', 'content-scale', 'rs'],
  cooldown: 10,
  execute (message, args, client, helper) {
    const cmdHelper = require('./../command-helper')
    const request = require('request').defaults({ encoding: null })
    const LiquidScaling = require('./../liquid-scaling/index')

    let emote = cmdHelper.checkImage(message, args, client, helper)
    if (!emote) {
      // no image or emote found
      console.log(`${message.author.username} failed to use ${this.name} correctly`)
      return message.reply(`you must specify an emote or attachment \n \`${this.usage}\``)
    }
    // indicate to the user that we are actually working
    message.channel.startTyping()
    // if we have a guildemoji object, we need to pull the URL from it
    if (emote.url === undefined) emote = emote.url
    // now try to download the emote as a base64 string
    let imageData
    request.get(emote, function (err, resp, body) {
      if (!err && resp.statusCode === 200) {
        imageData = 'data:' + resp.headers['content-type'] + ';base64,' + Buffer.from(body).toString('base64')
      } else {
        throw err
      }
    })
    const img = new LiquidScaling()
  }
}
