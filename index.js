const fs = require('fs')
const Discord = require('discord.js')
const secrets = require('./secrets.json')
// https://discord.js.org/#/docs/main/master/topics/partials
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] })
const EmoteCache = require('./helper')
const Pandemonium = require('pandemonium')
client.commands = new Discord.Collection()
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))
const cooldowns = new Discord.Collection()
const workerpool = require('workerpool')
const path = require('path')
const moment = require('moment')
const cmdHelper = require('./command-helper')

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

console.log('firebase active')
const db = fbAdmin.database()

for (const file of commandFiles) {
  const command = require(`./commands/${file}`)

  // set a new item in the Collection
  // with the key as the command name and the value as the exported module
  client.commands.set(command.name, command)
}
client.once('ready', () => {
  console.log('cubemoji running!')
  const serverlist = []
  client.guilds.cache.forEach(key => serverlist.push(key.name))
  console.log(`active on the following servers: ${serverlist}`)
  // wait to let the emote cache warm up
  setTimeout(setStatus, 20000)
})
client.login(secrets.token)

// helper serves as a catch-all reference object that
// commands can use to spin up workers, access the emote cache
// and update the firebase database
const util = {
  cache: new EmoteCache(client),
  pool: workerpool.pool(path.join(__dirname, 'worker.js')),
  emojiDb: db.ref('emojis/'),
  slotsDb: db.ref('slots/'),
  slotsUsers: new Set(),
  topPlayer: '', // cached local user to calculate time on top
  topPlayerTime: '',
  beginTop: '',
  matches: {},
  openUsers: new Set(),
  rescaleMsgs: {} // used to determine whether we can delete a message
}

util.cache.createEmoteArray()
console.log('initialized emote array')

function setStatus () {
  const emotes = util.cache.createEmoteArray(true)
  const msg = `c!help :${Pandemonium.choice(emotes)}:`
  client.user.setActivity(msg, { type: 'WATCHING' })
  // we also take this as an opportunity to clear out the downloaded
  // images folder
  const dir = './download/'
  fs.readdir(dir, (err, files) => {
    if (err) console.error(err)
    files.forEach(file => {
      fs.unlink(path.join(dir, file), err => {
        if (err) console.error(err)
      })
    })
  })
}

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
  if (channel.type !== 'dm') {
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
  return true
}

// ambiently adds a point whenever a user sends a message, requiring them to still
// have run c!sl at least once
// also check the cache
function ambPointAdd (user) {
  if (util.slotsUsers.has(user.id) &&
  Pandemonium.choice([true, false])) {
    util.slotsDb.once('value')
      .then(snapshot => {
        const childUser = snapshot.child(user.id)
        if (childUser.exists()) {
          const prevVal = childUser.val().score
          const newScore = prevVal + Pandemonium.random(1, 40)
          util.slotsDb.child(user.id).update({
            score: newScore,
            username: user.username
          })
        }
      })
  }
}

// calculate the difference in time of a top player
// adding that value to their existing time and returning it
function calcTimeDiff () {
  const curTime = new Date()
  // saving in seconds
  const diff = (Math.abs(curTime - util.beginTop)) / 1000
  // save that value
  return util.topPlayerTime + diff
}

// here we cache a basic list of slots users so we don't have to check the database constantly for ambient msgs
// as well as update the scoreboard obj
util.slotsDb.on('child_added', function (snapshot) {
  util.slotsUsers.add(snapshot.key)
})

let thievesCount = 0

util.slotsDb.orderByChild('score').limitToLast(1).on('child_added', function (snapshot) {
  // to avoid sending thieves messages every single time we start up the bot, we keep a counter
  // to make sure it doesn't go off the first time
  if (thievesCount > 0) {
    // new user becomes top player
    util.topPlayer = snapshot.key
    util.beginTop = new Date()
    util.topPlayerTime = snapshot.val().timeOnTop
    // send a message to #thieves that we have a new top player
    client.channels.fetch('800411922499502113').then(thievesChannel => {
      const topPlayerEmbed = new Discord.MessageEmbed()
        .setColor('GOLD')
        .setTitle(`👑 New Top Player: ${snapshot.val().username} 👑`)
        .addField('Score', snapshot.val().score)
        .addField('Time on Top', moment.duration(snapshot.val().timeOnTop, 'seconds').humanize())
      thievesChannel.send(topPlayerEmbed)
    })
  }
  thievesCount++
})

util.slotsDb.orderByChild('score').limitToLast(1).on('child_removed', function () {
  // user leaves top player spot
  util.slotsDb.child(util.topPlayer).update({
    timeOnTop: calcTimeDiff()
  })
})

client.on('message', message => {
  const args = message.content.slice(secrets.prefix.length).trim().split(/ +/)
  if (!message.content.toLowerCase().startsWith(secrets.prefix) || message.author.bot) {
    // random chance that we will ambiently add points for the user
    // for non command messages
    ambPointAdd(message.author)
    if (message.channel.type === 'dm' && !message.author.bot) {
      ambPointAdd(message.author)
      client.commands.get('message').execute(message, message.content.split(' '), client, util)
    }
    return
  }

  // now we determine the command name from the string
  const commandName = args.shift().toLowerCase()

  // then convert from alias if necessary
  const cmd = client.commands.get(commandName) ||
   client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))

  if (!cmd) {
    // log this msg as well
    message.react('❔')
    console.log(`${message.author.username} tried to use the invalid command "c!${commandName}"`)
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
      // prevent people from just spamming the bot
      const authorTimestamp = timestamps.get(message.author.id)
      if (now < authorTimestamp.nextUsage) {
        // prevent spam by increasing the time to use on each repeated use
        authorTimestamp.nextUsage += (cooldownAmount * authorTimestamp.uses)
        authorTimestamp.uses++
        if (authorTimestamp.nextUsage > (now + (cooldownAmount * 20))) {
          // limit to a max of a cooldownAmount * 20
          authorTimestamp.nextUsage = now + (cooldownAmount * 20)
        }
        const timeLeft = (authorTimestamp.nextUsage - now) / 1000
        if (authorTimestamp.uses !== 1) {
          // don't penalize the user for making an initial mistake in their command
          const msg = message.reply(`Please wait ${timeLeft.toFixed(0)} more seconds before executing \`${cmd.name}\`. *This message will delete itself once you can run the command again.*`)
          msg.then(resolvedMsg => {
            function delMsg (resolvedMsg) {
              resolvedMsg.delete()
            }
            setTimeout(delMsg, authorTimestamp.nextUsage - now, resolvedMsg)
          })
          return msg
        }
      } else {
        // remove the entry for that user
        timestamps.delete(message.author.id)
      }
    } else {
      // save a reference to the author's id and the next time they can use the command
      const tsObj = {
        nextUsage: now + cooldownAmount,
        uses: 0
      }
      timestamps.set(message.author.id, tsObj)
    }
  }

  try {
    // we tie multiple things to this helper variable including a worker pool for complex functions,
    // the emote cache wrapper class, and other things
    cmd.execute(message, args, client, util)
    message.channel.stopTyping(true)
  } catch (error) {
    console.error(error)
    message.reply('there was an error trying to execute that command!')
  }
})

client.on('messageReactionAdd', async (react, author) => {
/*  this set of conditionals checks to make sure that cubemoji itself added a react
    to a message to delete, modify the message, edit a msg, rescale a msg */
  if (react.message.partial) await react.message.fetch()
  if (react.partial) await react.fetch()
  const cubemojiID = '792878401589477377'
  const okayToDelete = util.rescaleMsgs[react.message.id] === author.id
  if (react.users.cache.has(cubemojiID) &&
  author.id !== cubemojiID &&
  react.message.author.id === cubemojiID) {
    if (react.emoji.name === '🎲') {
      // ensures it's cubemoji
      react.message.edit(Pandemonium.choice(util.cache.createEmoteArray()).toString())
      react.message.reactions.resolve(react).users.remove(author)
    }
    if (react.emoji.name === '🗑️' && okayToDelete) {
      try {
        react.message.delete()
      } catch (err) {
        console.error(err)
      }
    }
  }
  // applying image effects via reacts
  cmdHelper.checkImage(react.message, react.message.content.split(' '), client, util).then(result => {
    if (result) {
      if (react.emoji.name === '📷') {
        const args = [react.message.content, 'random']
        try {
          client.commands.get('edit').execute(react.message, args, client, util)
        } catch (err) {
          react.message.react('🤯')
          // we are failing silently
          console.error(err)
        }
      }
      if (react.emoji.name === '📏') {
        try {
          client.commands.get('rescale').execute(react.message, react.message.content.split(' '), client, util)
        } catch (err) {
          react.message.react('🤯')
          console.error(err)
        }
      }
      react.message.channel.stopTyping(true)
    }
  }
  )
})

// setup an interval to save time every 60 seconds to db
// and reset time tracking for the top player
setInterval(function () {
  if (util.slotsUsers.has(util.topPlayer)) {
    util.topPlayerTime = calcTimeDiff()
    util.beginTop = new Date()
    util.slotsDb.child(util.topPlayer).update({ timeOnTop: util.topPlayerTime })
  }
}, 60000)

// here we change the "playing on discord" msg every now and then
setInterval(setStatus, Pandemonium.random(30, 90) * 60000)
