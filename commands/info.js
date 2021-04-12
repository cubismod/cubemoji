require('./../extended-msg')
const moment = require('moment')
const ColorThief = require('colorthief')
const discordUtil = require('discord.js').Util
module.exports = {
  name: 'info',
  description: 'Provides information about an emote or user. https://gitlab.com/cubismod/cubemoji/-/wikis/commands/info',
  usage: 'info <emote_name/emote/mention>',
  aliases: ['i'],
  cooldown: 1,
  requiresCache: true,
  execute (message, args, client, util) {
    if (args.length < 1) {
      message.inlineReply('You must specify an emote name/user in the command!')
    } else {
      const user = util.cache.parseMention(message.content, client)
      if (user) {
        // TODO: show leaderboard score
        // TODO: add'l colors
        const avatarURL = user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 })
        ColorThief.getColor(avatarURL).then(
          // retrieve dominant color from user avatar
          color => {
            const resolvedColor = discordUtil.resolveColor(color)
            // return user information
            const fields = [
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
            // if the user is on the leaderboard, add their score fields
            util.slotsDb.orderByKey().equalTo(user.id).once('value').then(snapshot => {
              let json = snapshot.toJSON()
              if (json !== null) {
                // actually get the fields now
                json = json[user.id]
                // if we actually have fields for that user, then we add them
                fields.push({ name: 'Leaderboard Score', value: `${json.score} pts` })
                fields.push({ name: 'Time on Top', value: `${moment.duration(json.timeOnTop, 'seconds').humanize()}` })
              }
              const embed = {
                title: user.tag,
                image: { url: avatarURL },
                color: resolvedColor,
                fields: fields
              }
              message.channel.send({ embed: embed })
            })
          }
        )
      } else {
        // emoji names are only one word long so we will only consider the 0th element
      // also doing case insensitive searching
        const emoteName = args[0].toLowerCase()
        let res = util.cache.retrieve(emoteName)
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
          res = util.cache.search(args[0])
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
