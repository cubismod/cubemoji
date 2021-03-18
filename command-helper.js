// helper functions for use in command files
const Discord = require('discord.js')
const Pandemonium = require('pandemonium')
const FileType = require('file-type')
const got = require('got')
const secrets = require('./secrets.json')

// checks if a mashup of two emotes is available via Google's Emoji
// kitchen API, returns false if nothing found
async function mashup (emotes) {
  try {
    const params = {
      key: secrets.mashup,
      client_key: 'gboard',
      media_filter: 'png_transparent',
      collection: 'emoji_kitchen_v5',
      q: emotes
    }
    const response = await got('https://tenor.googleapis.com/v2/featured', { searchParams: params }).json()
    // now we handle that response
    const url = response.results[0].url
    return url
  } catch (error) {
    console.error(error.response.body)
    return false
  }
}

// check whether an image is a valid type
async function checkValidType (url) {
  const stream = got.stream(url)
  const type = await FileType.fromStream(stream)
  const validTypes = ['jpg', 'jpeg', 'gif', 'png']

  if (type !== undefined && validTypes.includes(type.ext)) return true
  else return false
}
// check image
// returns <image URL, false if nothing found>
async function checkImage (message, args, client, helper) {
  message.channel.startTyping()
  // check first for a message
  if (message.attachments.size > 0) {
    const attachment = message.attachments.random(1)
    // get the first attachment url and return
    if (Object.prototype.hasOwnProperty.call(attachment[0], 'url')) {
      const valid = await checkValidType(attachment[0].url)
      if (valid) return attachment[0].url
      return false
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
  const urlReg = /^https?:\/\/.+.(png|jpeg|jpg|gif)$/
  if (args[0].match(urlReg)) {
    // check now whether the image is an okay type for cubemoji to edit
    const valid = await checkValidType(args[0])
    if (valid) return args[0]
  }
  // or else try the cache
  const res = helper.cache.retrieve(argName)
  if (!res) {
  // if not that then we search
    const searchRes = helper.cache.search(args[0])
    if (searchRes.length !== 0) {
      return searchRes[0].item.url
    }
  } else return res.url
  // we don't need to do any validity checks above since the cache is guaranteed to
  // return image urls
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
