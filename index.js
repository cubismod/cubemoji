const fs = require('fs')
const Discord = require('discord.js')
const secrets = require('./secrets.json')
const client = new Discord.Client()
const EmoteCache = require('./helper')

client.commands = new Discord.Collection()
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))
const cooldowns = new Discord.Collection()

// this is used to log various messages to a specific Discord channel
// content is a string
// severity is an int
// 0 - 2 that will determine the color of the message
// function logMsg (content, severity) {
//   let color
//   switch (severity) {
//     case 0:
//       color = 4494926
//       break
//     case 1:
//       color = 16312092
//       break
//     case 2:
//       color = 13632027
//       break
//   }
//   client.channels.fetch('793650181533859880')
//     .then(channel => console.log(channel.name))
//     .catch(console.error)
  // .then(channel => {
  //     if (content.length > 2040) {
  //       channel.send(`Unable to send a log message with ${content.length} characters`)
  //     }

  //     const msgEmbed = new Discord.MessageEmbed()
  //       .setTimestamp()
  //       .setColor(color)
  //       .setDescription(content)

  //     channel.send(msgEmbed)
  //   }, reason => {
  //     console.error(`unable to send log message due to ${reason}`)
  //   })
// }

for (const file of commandFiles) {
  const command = require(`./commands/${file}`)

  // set a new item in the Collection
  // with the key as the command name and the value as the exported module
  client.commands.set(command.name, command)
}
client.once('ready', () => {
  console.log('app running!')
})
client.login(secrets.token)

const cache = new EmoteCache(client)

client.on('message', message => {
  const args = message.content.slice(secrets.prefix.length).trim().split(/ +/)
  const command = args.shift().toLowerCase()

  // ensure bots can't trigger the command and that we are using
  // c! as a prefix
  if (!message.content.toLowerCase().startsWith(secrets.prefix) || message.author.bot) return

  // check for cooldowns on the command
  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Discord.Collection())
  }

  const now = Date.now()
  const timestamps = cooldowns.get(command.name)
  const cooldownAmount = (command.cooldown || 3) * 1000

  if (timestamps.has(message.author.id)) {
    const expirationTime = timestamps.get(message.author.id) + cooldownAmount

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000
      return message.reply(`Please wait ${timeLeft.toFixed(1)} more seconds before executing \`${command.name}\``)
    }
  }

  // command aliasing
  const cmd = client.commands.get(command) ||
        client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(command))

  if (!cmd) {
    message.react('❔')
    return
  }

  try {
    // we only require the cached emote class on certain calls which is specified
    // in each module
    if (cmd.requiresCache) {
      cmd.execute(message, args, client, cache)
    } else {
      cmd.execute(message, args, client)
    }
  } catch (error) {
    console.error(error)
    message.reply('there was an error trying to execute that command!')
  }
})
