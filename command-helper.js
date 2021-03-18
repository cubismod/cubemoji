// helper functions for use in command files
const Discord = require('discord.js')
const Pandemonium = require('pandemonium')
const FileType = require('file-type')
const got = require('got')

// check whether an image is a valid type
async function checkValidType (url) {
  const stream = got.stream(url)
  const type = FileType.fromStream(stream)
  const validTypes = ['jpg', 'jpeg', 'gif', 'png']

  if (validTypes.includes(type.ext)) return true
  return false
}
// check image
// returns <image URL, false if nothing found>
function checkImage (message, args, client, helper) {
  message.channel.startTyping()
  // check first for a message
  if (message.attachments.size > 0) {
    const attachment = message.attachments.random(1)
    // get the first attachment url and return
    if (Object.prototype.hasOwnProperty.call(attachment[0], 'url')) {
      checkValidType(attachment[0].url).then(val => {
        if (val === true) return attachment[0].url
        return false
      })
      return attachment[0].url
    }
  }
  // otherwise we check the args
  if (args.length < 1) return false
  // check if a mention or twemoji
  const argName = args[0].toLowerCase()
  const avatarUrl = helper.cache.getAvatar(argName, client)
  const twemoji = helper.cache.parseTwemoji(argName)

  if (avatarUrl) return avatarUrl
  if (twemoji) return twemoji.url
  // check now whether the image is an okay type for cubemoji to edit
  checkValidType(args[0]).then(val => {
    if (val === true) return args[0]
    return false
  })
  // or else try the cache
  const res = helper.cache.retrieve(argName)
  if (!res) {
    // if not that then we search
    const searchRes = helper.cache.search(args[0])
    if (searchRes.length !== 0) {
      return searchRes[0].item.url
    }
  } else return res.url

  return false
}

// image error, returns an embed of an error occured along with some
// technical details in the form of an embed
function imgErr (error, helper, author) {
  // pick a random sad emote using Fuse.js extended syntax
  const sadEmote = Pandemonium.choice(helper.cache.search('cry|sad|ohno')).item
  const errEmbed = new Discord.MessageEmbed()
    .setColor('RED')
    .setTitle(`${sadEmote} an error occurred when processing your image!`)
    .setDescription(`${author} Your image may have been too large or an unsupported file type causing the rescale to fail. See technical details below`)
    .addFields(
      { name: 'Error Details', value: `\`\`\`${error.message.slice(0, 1000)}\`\`\`` }
    )
    // ensure that we don't go past the limits of a discord msg
  return errEmbed
}

module.exports = {
  checkImage,
  imgErr
}
