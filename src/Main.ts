/* eslint-disable node/no-path-concat */
import 'reflect-metadata'
import { Client } from '@typeit/discord'
import secrets from '../secrets.json'

async function start () {
  const client = new Client({
    classes: [
      `${__dirname}/*Discord.ts`, // glob string to load the classes
      `${__dirname}/*Discord.js` // If you compile using "tsc" the file extension change to .js
    ],
    silent: false,
    variablesChar: 'd!'
  })

  await client.login(secrets.token)
}

start()
