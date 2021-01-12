module.exports = {
  name: 'emote',
  description: 'Inserts an emote',
  usage: '[emote] <emote as string or emoji>',
  aliases: ['emoji', 'e'],
  cooldown: 1,
  requiresCache: true,
  execute (message, args, client, helper) {
    console.log('emote command used')
    if (args.length < 1) {
      message.reply('You must specify an emote in the command!')
    } else {
      // emoji names are only one word long so we will only consider the 0th element
      // also doing case insensitive searching
      const emoteName = args[0].toLowerCase()
      let res = helper.cache.retrieve(emoteName)
      if (res && !('external' in res)) {
        // ensure we're not sending external emotes
        message.channel.send(res.toString())
      } else {
        // retrieve a result from the cache
        res = helper.cache.search(args[0])
        if (res.length > 0) {
          message.channel.send(res[0].item.toString())
        } else {
          message.reply('emote not found!')
        }
      }
    }
  }
}
