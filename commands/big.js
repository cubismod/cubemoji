module.exports = {
  name: 'big',
  description: 'Creates a big version of an emote. If the emote is not found, then it performs a search and returns the emote closest matching the emote name.',
  usage: 'big <emote/emote name>',
  aliases: ['b', 'large', 'enhance'],
  cooldown: 1,
  execute (message, args, _client, helper) {
    if (args.length < 1) {
      console.log(`${message.author.username} failed to use ${this.name} correctly`)
      message.reply(`You must specify an emote in the command!\n \`${this.usage}\``)
    } else {
      // emoji names are only one word long so we will only consider the 0th element
      // also doing case insensitive searching
      let res = helper.cache.retrieve(args[0])
      if (res) {
        message.channel.send(res.url)
      } else {
        // retrieve a result from the cache
        // TODO: bring feature parity of allowing nitro emtoes
        res = helper.cache.search(args[0])
        if (res.length > 1) {
          message.channel.send(res[0].item.url)
          message.reply(`emote not found! Maybe try ${res[0].item} - \`${res[0].item.name}\`?`)
        } else {
          message.reply('emote not found!')
        }
      }
    }
  }
}
