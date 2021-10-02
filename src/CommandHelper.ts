// helper functions for use in command files
import Discord = require('discord.js')
import Pandemonium = require('pandemonium')
import FileType = require('file-type')
import got from 'got/dist/source'
import { createWriteStream } from 'fs'
import path = require('path')
import { reject } from 'p-cancelable'
import { Companion } from './Cubemoji'

const companion : Companion = globalThis.companion

// check whether an image is a valid type
// TODO: implement promise rejection here
export async function checkValidType (url: string) {
  const stream = await got.stream(url)
  const type = await FileType.fromStream(stream)
  const validTypes = ['jpg', 'jpeg', 'gif', 'png']

  if (type !== undefined && validTypes.includes(type.ext)) return true
  else return false
}

/**
 * check image
 * @param message - the discord message we are parsing
 * @returns promise to image url or '' if nothing found
 */
export async function checkImage (message: Discord.Message) {
  const args = message.content.split(' ')
  // check first for a message
  if (message.attachments.size > 0) {
    const attachment = message.attachments.random(1)
    // get the first attachment url and return
    if (Object.prototype.hasOwnProperty.call(attachment[0], 'url')) {
      const valid = await checkValidType(attachment[0].url)
      if (valid) return attachment[0].url
      return ''
    }
  }
  // otherwise we check the args
  if (args.length < 1) return ''
  // check if a mention or twemoji
  const argName = args[0].toLowerCase()
  const avatarUrl = companion.cache.getAvatar(argName)
  const twemoji = companion.cache.parseTwemoji(argName)

  if (avatarUrl) return avatarUrl
  if (twemoji) return twemoji
  const urlReg = /^https?:\/\/.+.(png|jpeg|jpg|gif)$/
  if (args[0].match(urlReg)) {
    // check now whether the image is an okay type for cubemoji to edit
    const valid = await checkValidType(args[0])
    if (valid) return args[0]
  }
  // or else try the cache
  const res = await companion.cache.retrieve(argName)
  if (!res) {
  // if not that then we search
    const searchRes = companion.cache.search(args[0])
    if (searchRes.length !== 0) {
      return searchRes[0].item.url
    }
  } else return res.url
  // we don't need to do any validity checks above since the cache is guaranteed to
  // return image urls
  return ''
}

// image error, returns an embed of an error occured along with some
// technical details in the form of an embed
export function imgErr (error: Error, author: Discord.User) {
  // pick a random sad emote using Fuse.js extended syntax
  const sadEmote = Pandemonium.choice(companion.cache.search('cry|sad|ohno')).item
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

/**
 * download an image file to the local FS under the download folder
 * @param url - link to the img
 * @returns promise for a url or rejection if a download issue occurs
 */
export async function downloadImage (url: string) {
  const fn = path.resolve(`./download/${Date.now()}`)
  await got.stream(url)
    .on('downloadProgress', progress => {
      // cap downloads at 50MB
      if (progress.total > 5e+7) {
        reject(new Error(`Filesize of ${progress.total / 1e-6} MB greater than maximum size of 50MB`))
      }
    })
    .on('error', (error: Error) => {
      reject(error)
    })
  await createWriteStream(fn).on('error', (error: Error) => { reject(error) })
  return fn
}
