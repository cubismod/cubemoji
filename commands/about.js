module.exports = {
  name: 'about',
  description: 'Information about the bot!',
  aliases: ['a'],
  usage: '[about/a]',
  requiresCache: false,
  execute (message) {
    message.channel.send('Here is my git! https://gitlab.com/cubismod/cubemoji. I was made lovingly by cubis. Bugs/issues/feature requests should go on the git.')
  }
}
