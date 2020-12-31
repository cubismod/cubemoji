module.exports = {
  name: 'emote',
  description: 'Inserts an emote',
  usage: '[emote/emoji/e] <emote_name>',
  aliases: ['emoji', 'e'],
  requiresCache: true,
  execute (message, args, client, cache) {
    console.log('emote command used')
    if (args.length < 1) {
      message.reply('You must specify an emote name in the command!')
    } else {
      // emoji names are only one word long so we will only consider the 0th element
      // also doing case insensitive searching
      const emoteName = args[0].toLowerCase()
      let res = client.emojis.cache.find(emote => emote.name.toLowerCase() === emoteName)
      if (res) {
        message.channel.send(res.toString())
      } else {
        // retrieve a result from the cache
        res = cache.search(args[0])
        if (res.length > 1) {
          message.reply(`emote not found! Maybe try ${res[0]} - \`${res[0].name}\`?`)
        } else {
          message.reply('emote not found!')
        }
      }
    }
  }
}
