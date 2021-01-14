module.exports = {
  name: 'info',
  description: 'Gets details about an emote',
  usage: '[info] <emote_name/emote>',
  aliases: ['i'],
  cooldown: 1,
  requiresCache: true,
  execute (message, args, client, helper) {
    // console.log('emote command used')
    if (args.length < 1) {
      message.reply('You must specify an emote name in the command!')
    } else {
      // emoji names are only one word long so we will only consider the 0th element
      // also doing case insensitive searching
      const emoteName = args[0].toLowerCase()
      let res = helper.cache.retrieve(emoteName)
      if (res) {
        const author = res.fetchAuthor()
        author.then((author) => {
          const embed = {
            title: res.toString(),
            color: 7738070,
            description: res.name,
            fields: [
              {
                name: 'Created',
                value: res.createdAt
              },
              {
                name: 'ID',
                value: res.id
              },
              {
                name: 'URL',
                value: res.url
              },
              {
                name: 'author',
                value: author
              }
            ]
          }
          message.channel.send({ embed: embed })
        }).catch((reason) => {
          console.log(reason)
          // send msg without author
          const embed = {
            title: res.toString(),
            color: 7738070,
            description: res.name,
            fields: [
              {
                name: 'Created',
                value: res.createdAt
              },
              {
                name: 'ID',
                value: res.id
              },
              {
                name: 'URL',
                value: res.url
              }
            ]
          }
          message.channel.send({ embed: embed })
        })
      } else {
        // retrieve a result from the cache
        res = helper.cache.search(args[0])
        if (res.length > 0) {
          message.reply(`emote not found! Maybe try ${res[0].item} - \`${res[0].item.name}\`?`)
        } else {
          message.reply('emote not found!')
        }
      }
    }
  }
}
