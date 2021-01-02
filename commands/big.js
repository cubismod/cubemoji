module.exports = {
  name: 'big',
  description: 'Creates a big version of an emote',
  usage: '[source] <emote_name/emote>',
  aliases: [],
  requiresCache: true,
  execute (message, args, client, cache) {
    console.log('big command used')
    if (args.length < 1) {
      message.reply('You must specify an emote name in the command!')
    } else {
      // emoji names are only one word long so we will only consider the 0th element
      // also doing case insensitive searching
      let res = cache.retrieve(args[0])
      if (res) {
        message.channel.send(res.url)
      } else {
        // retrieve a result from the cache
        res = cache.search(args[0])
        if (res.length > 1) {
          message.reply(`emote not found! Maybe try ${res[0].item} - \`${res[0].item.name}\`?`)
        } else {
          message.reply('emote not found!')
        }
      }
    }
  }
}
