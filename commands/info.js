require('./../extended-msg')
const ColorThief = require('colorthief')
const util = require('discord.js').Util
module.exports = {
  name: 'info',
  description: 'Provides information about an emote or user. https://gitlab.com/cubismod/cubemoji/-/wikis/commands/info',
  usage: 'info <emote_name/emote/mention>',
  aliases: ['i'],
  cooldown: 1,
  requiresCache: true,
  execute (message, args, client, helper) {
    if (args.length < 1) {
      message.inlineReply('You must specify an emote name/user in the command!')
    } else {
      const user = helper.cache.parseMention(message.content, client)
      if (user) {
        // TODO: add support for animated avatars...
        // TODO: show leaderboard score
        // TODO: add'l colors
        const avatarURL = user.displayAvatarURL({ format: 'png' })
        ColorThief.getColor(avatarURL).then(
          // retrieve dominant color from user avatar
          color => {
            const resolvedColor = util.resolveColor(color)
            // return user information
            const embed = {
              title: user.tag,
              image: { url: avatarURL },
              color: resolvedColor,
              fields: [
                {
                  name: 'ID',
                  value: user.id
                },
                {
                  name: 'Discord Join Date',
                  value: user.createdAt
                },
                {
                  name: 'Bot',
                  value: user.bot
                },
                {
                  name: 'Dominant Color',
                  value: `#${resolvedColor.toString(16)}`
                }
              ]
            }
            message.channel.send({ embed: embed })
          }
        )
      } else {
        // emoji names are only one word long so we will only consider the 0th element
      // also doing case insensitive searching
        const emoteName = args[0].toLowerCase()
        let res = helper.cache.retrieve(emoteName)
        if (res) {
          const author = res.fetchAuthor()
          author.then((author) => {
            const embed = {
              title: res.name,
              color: 7738070,
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
                  name: 'Author',
                  value: author.username
                },
                {
                  name: 'Animated',
                  value: res.animated
                },
                {
                  name: 'Origin Server Name',
                  value: res.guild.name
                }
              ]
            }
            message.channel.send(`${res}`, { embed: embed })
          }).catch((reason) => {
            console.error(reason)
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
            message.inlineReply(`emote not found! Maybe try ${res[0].item} - \`${res[0].item.name}\`?`)
          } else {
            message.inlineReply('emote not found!')
          }
        }
      }
    }
  }

}
