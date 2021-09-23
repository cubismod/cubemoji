/* eslint-disable node/no-path-concat */
import 'reflect-metadata'
import { Intents } from 'discord.js'
import { Client } from '@typeit/discord'
import secrets from '../secrets.json'
import pkginfo from '../package.json'

async function start () {
  const client = new Client({
    intents: [
      Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ],
    classes: [
      `${__dirname}/*Discord.ts`, // glob string to load the classes
      `${__dirname}/*Discord.js` // If you compile using "tsc" the file extension change to .js
    ],
    silent: false
  })

  await client.login(secrets.token)
  console.log(`cubemoji ${pkginfo.version} is now running...`)
}

start()
