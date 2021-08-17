import { ExtMsg } from '../extended-msg'
import Discord = require('discord.js')
import { Cubemoji } from '../types/cubemoji/cubemoji'

export class Info implements Cubemoji.Command {
  name = 'info'
  description = 'Provides information about an emote or user. https://gitlab.com/cubismod/cubemoji/-/wikis/commands/info'
  usage = 'info <emote_name/emote/mention>'
  aliases = ['i']
  cooldown = 1

  execute (message: Discord.Message, args: string[], client: Discord.Client, util: Cubemoji.Util) {
    const extMsg = new ExtMsg(message)
    // TODO: colorthief replacemnt
    if (args.length < 1) {
      extMsg.inlineReply('You must specify an emote name/user in the command!')
    } else {
      const user = util.cache.parseMention(message.content, client)
      if (user) {
        // person info code
        const avatarURL = user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 })
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
          }
        ]
        const embed = {
          title: user.tag,
          image: { url: avatarURL },
          fields: fields
        }
        message.channel.send({ embed: embed })
      } else {
        // emoji info code
        // emoji names are only one word long so we will only consider the 0th element
        // also doing case insensitive searching
        const emoteName = args[0].toLowerCase()
        const res = util.cache.retrieve(emoteName)
        const embed = new Discord.MessageEmbed()
        embed.color = 7738070
        if (res instanceof Discord.GuildEmoji) {
          embed.addField('Created', res.createdAt)
          embed.addField('ID', res.id)
          embed.addField('URL', res.url)
          embed.addField('Animated', res.animated)
          embed.addField('Origin Server Name', res.guild.name)
          res.fetchAuthor().then(author => {
            // for some reason we have to do another typecheck
            if (res instanceof Discord.GuildEmoji) {
              embed.addField('Author', author.username)
              message.channel.send(`${res}`, { embed: embed })
            }
          }).catch(reason => {
            // if we can't retrieve the emoji author, we just don't add an author field and silently error
            console.error(reason)
            message.channel.send(`${res}`, { embed: embed })
          })
        }
        // check if cubemoji emote
        if (res !== undefined && 'mutant' in res) {
          embed.addField('URL', res.url)
          if (res.mutant) {
            // add attribution text
            embed.addField('Attribution', ' This bot uses Mutant Standard emoji (https://mutant.tech), which are licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (https://creativecommons.org/licenses/by-nc-sa/4.0/).')
          }
          message.channel.send(`${res}`, { embed: embed })
        }
        if (res === undefined) {
          extMsg.inlineReply('Unable to parse that emoji/mention! Please try something else.')
        }
      }
    }
  }
}
