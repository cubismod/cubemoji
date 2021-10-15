// helper functions for use in command files
import FileType = require('file-type')
import got from 'got/dist/source'
import { createWriteStream } from 'fs'
import path = require('path')
import { reject } from 'p-cancelable'
import { DIService } from 'discordx'
import { container } from 'tsyringe'
import { EmoteCache } from './EmoteCache'
import { randomUUID } from 'crypto'
import { promisify } from 'util'
import { pipeline } from 'stream'

// return true if this is a URL w/ a valid extension, false if it isn't
export async function isUrl (url: string) {
  const urlReg = /^https?:\/\/.+/
  if (url.match(urlReg)) {
    // looks like an https url
    // now check the filetype
    const stream = await got.stream(url)
    const type = await FileType.fromStream(stream)
    const validTypes = ['jpg', 'jpeg', 'gif', 'png']

    if (type !== undefined && validTypes.includes(type.ext)) return true
    else return false
  } else return false
}

// checks a string to see if there is an emote or URL there and then returns the URL
// that we will use for edits
export async function getUrl (source: string) {
  const emoteCache = grabEmoteCache()
  // yes that's a URL we can use for editing
  if (await isUrl(source)) return source
  else if (emoteCache !== undefined) {
    // see if it's an emote
    const res = await emoteCache.retrieve(source)
    if (res === undefined) return undefined
    else return res.url
  } else return ''
}

/**
 * download an image file to the local FS under the download folder
 * @param url - link to the img
 * @returns promise for a url or rejection if a download issue occurs
 */
export async function downloadImage (url: string) {
  const fn = path.resolve(`download/${randomUUID()}`)
  const pl = promisify(pipeline)
  await pl(
    got.stream(url)
      .on('downloadProgress', progress => {
        console.log(progress)
        // cap downloads at 50MB
        if (progress.total > 5e+7) {
          reject(new Error(`Filesize of ${progress.total / 1e-6} MB greater than maximum size of 50MB`))
        }
      })
      .on('error', (error: Error) => {
        console.error(error.message)
      }),
    createWriteStream(fn).on('error', (error: Error) => { reject(error) })
  )
  return fn
}

/**
 * grab an emote cache TSyringe container or return
 * undefined if there is no container
 */
export function grabEmoteCache () {
  if (DIService.container) return container.resolve(EmoteCache)
  else return undefined
}
