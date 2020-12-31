module.exports = {
  name: 'about',
  description: 'Information about the bot!',
  aliases: ['a'],
  usage: '[about/a]',
  requiresCache: false,
  execute (message, args, client) {
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
        }
      ]
    }
    message.channel.send({ embed: embed })
  }
}
