// helper functions for use in command files
import Discord = require('discord.js')
import Pandemonium = require('pandemonium')
import FileType = require('file-type')
import got = require('got')
import { Cubemoji } from './types/cubemoji/cubemoji'

// check whether an image is a valid type
export async function checkValidType (url: string) {
  const stream = got.default(url, {isStream: true})
  const type = await FileType.fromStream(stream)
  const validTypes = ['jpg', 'jpeg', 'gif', 'png']

  if (type !== undefined && validTypes.includes(type.ext)) return true
  else return false
}

// check image
// returns <image URL, false if nothing found>
// args - the msg content split into an array similar to how command
// line arguments are processed
// client - Discord client object
// util - use the utility object passed from the index file
export async function checkImage (message: Discord.Message, args: string[], client: Discord.Client, util: Cubemoji.Util) {
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
  const avatarUrl = util.cache.getAvatar(argName, client)
  const twemoji = util.cache.parseTwemoji(argName)

  if (avatarUrl) return avatarUrl
  if (twemoji) return twemoji.url
  const urlReg = /^https?:\/\/.+.(png|jpeg|jpg|gif)$/
  if (args[0].match(urlReg)) {
    // check now whether the image is an okay type for cubemoji to edit
    const valid = await checkValidType(args[0])
    if (valid) return args[0]
  }
  // or else try the cache
  const res = util.cache.retrieve(argName)
  if (!res) {
  // if not that then we search
    const searchRes = util.cache.search(args[0])
    if (searchRes.length !== 0) {
      return searchRes[0].item.url
    }
  } else return res.url
  // we don't need to do any validity checks above since the cache is guaranteed to
  // return image urls
}

// image error, returns an embed of an error occured along with some
// technical details in the form of an embed
export function imgErr (error: Error, util: Cubemoji.Util, author: Discord.User) {
  // pick a random sad emote using Fuse.js extended syntax
  const sadEmote = Pandemonium.choice(util.cache.search('cry|sad|ohno')).item
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



