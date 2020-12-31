module.exports = {
  name: 'about',
  description: 'Information about the bot!',
  aliases: ['a'],
  usage: '[about/a]',
  requiresCache: false,
  execute (message, args, client) {
    const pkg = require('../package.json')
    console.log('about command used')
    const embed = {
      title: '<:cubemoji:793663899072200744>',
      color: 0x91d7f2,
      author: {
        name: 'Created by cubis'
      },
      description: 'a simple emoji bot built to last ⌛',
      fields: [
        {
          name: 'GitLab',
          value: 'https://gitlab.com/cubismod/cubemoji'
        },
        {
          name: 'Version',
          value: `${pkg.version}`
        },
        {
          name: 'License',
          value: `${pkg.license}`
        },
        {
          name: 'Stats',
          value: `Current Emote Count: ${client.emojis.cache.size}\nUptime: ${Math.floor(client.uptime / 60000)} min\nServers: ${client.guilds.cache.size}`
        }
      ]
    }
    message.channel.send({ embed: embed })
  }
}
