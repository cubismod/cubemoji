const fs = require('fs')
const Discord = require('discord.js')
const secrets = require('./secrets.json')
const client = new Discord.Client()
const EmoteCache = require('./helper')
const Pandemonium = require('pandemonium')
client.commands = new Discord.Collection()
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))
const cooldowns = new Discord.Collection()
const workerpool = require('workerpool')
const path = require('path')
require('log-timestamp')

// firebase setup
const fbAdmin = require('firebase-admin')
const svcAcct = require('./serviceAccountKey.json')

fbAdmin.initializeApp({
  credential: fbAdmin.credential.cert(svcAcct),
  databaseURL: 'https://cubemoji-default-rtdb.firebaseio.com/',
  databaseAuthVariableOverride: {
    uid: 'cubemoji-ds-bot'
  }
})

const db = fbAdmin.database()

for (const file of commandFiles) {
  const command = require(`./commands/${file}`)

  // set a new item in the Collection
  // with the key as the command name and the value as the exported module
  client.commands.set(command.name, command)
}
client.once('ready', () => {
  console.log('cubemoji running!')
  // set up help message
  client.user.setActivity('c!help', { type: 'WATCHING' })
})
client.login(secrets.token)

// helper serves as a catch-all reference object that
// commands can use to spin up workers, access the emote cache
// and update the firebase database
const helper = {
  cache: new EmoteCache(client),
  pool: workerpool.pool(path.join(__dirname, 'worker.js')),
  emojiDb: db.ref('emojis/'),
  slotsDb: db.ref('slots/')
}

console.log(`${helper.pool.maxWorkers} workers available`)

// function returns true if the command is allowed in the specific channel
// false if not
function checkWhiteList (channel, commandName) {
  /* so the command whitelist JSON file is organized like so:
  {
    (server id) {
      (command name) {
        (channel id)
      }
    }
  }
  channel whitelists are per server
  */
  const whitelist = require('./whitelist.json')
  try {
    if (Object.prototype.hasOwnProperty.call(whitelist, channel.guild.id)) {
      if (Object.prototype.hasOwnProperty.call(whitelist[channel.guild.id], commandName)) {
        if (Object.prototype.hasOwnProperty.call(whitelist[channel.guild.id][commandName], channel.id)) {
          return true
        }
      } else {
        return true
      }
    } else {
      return true
    }
    return false
  }
  catch (err) {
    // fail gracefully if we can't return a whitelist value
    console.log(err)
    return true
  }
}

client.on('message', message => {
  if (!message.content.toLowerCase().startsWith(secrets.prefix) || message.author.bot) return

  // now we determine the command name from the string
  const args = message.content.slice(secrets.prefix.length).trim().split(/ +/)
  const commandName = args.shift().toLowerCase()

  // then convert from alias if necessary
  const cmd = client.commands.get(commandName) ||
   client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))

  if (!cmd) {
    message.react('❔')
    return
  }

  // check the command whitelist
  if (!checkWhiteList(message.channel, cmd.name)) {
    return message.reply('This command is not allowed in this channel.')
  }

  // cooldown check and ensure that the command is allowed in the specific channel
  if ('cooldown' in cmd) {
    if (!cooldowns.has(cmd.name)) {
      cooldowns.set(cmd.name, new Discord.Collection())
    }

    const now = Date.now()
    const timestamps = cooldowns.get(cmd.name)
    const cooldownAmount = (cmd.cooldown || 3) * 1000

    if (timestamps.has(message.author.id)) {
      const expirationTime = timestamps.get(message.author.id) + cooldownAmount

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000
        return message.reply(`Please wait ${timeLeft.toFixed(1)} more seconds before executing \`${cmd.name}\`. The cooldown is ${cmd.cooldown} seconds`)
      }
    } else {
      timestamps.set(message.author.id, now)
      setTimeout(() => timestamps.delete(message.author.id), cooldownAmount)
    }
  }

  try {
    // we tie multiple things to this helper variable including a worker pool for complex functions,
    // the emote cache wrapper class, and other things
    cmd.execute(message, args, client, helper)
  } catch (error) {
    console.error(error)
    message.reply('there was an error trying to execute that command!')
  }
})

client.on('messageReactionAdd', (react, author) => {
/* this set of conditionals ensures that edit reaction behavior for c!cube
  is only processed on messages which cubemoji has marked already with 🎲
  as well as ensuring that cubemoji is not editing the message when it is applying
  a react itself */
  const id = '792878401589477377'
  if (react.users.cache.has(id) &&
  author.id !== id &&
  react.emoji.name === '🎲' &&
  react.message.author.id === id) {
    // ensures it's cubemoji
    react.message.edit(Pandemonium.choice(helper.cache.createEmoteArray()).toString())
    react.message.reactions.resolve(react).users.remove(author)
    // react.message.reactions.removeAll().then(react.message.react('🎲'))
  }
})
