import { Cubemoji } from '../types/cubemoji/cubemoji'
import Discord = require('discord.js')
import { ExtMsg } from '../extended-msg'
import Fuse = require('fuse.js')

export class Help implements Cubemoji.Command {
  name = 'help'
  description = 'Get more information on commands!'
  usage = 'help opt_command_name'
  aliases = ['h']
  cooldown = 1
  execute (message: Discord.Message, args: string[], client: Discord.Client, util: Cubemoji.Util) {
    const extMsg = new ExtMsg(message)
    if (args.length === 0) {
      // just offer up list of other commands available
      let text = 'The following commands are available:\n'
      util.commands.forEach(function (command) {
        text = text.concat(`\`${command.name}\`, `)
      })
      text = text.concat('Type `c!help <command_name>` to get more info about a specific command. \nGet help online: https://gitlab.com/cubismod/cubemoji/-/wikis/home\nReact 📏 on any message to rescale an image & 📷 to edit any image.')
      message.channel.send(text)
    } else {
      // specific command
      const rawCmd = args[0].toLowerCase()
      const command = util.commands.get(rawCmd) || util.commands.find(c => c.aliases.includes(rawCmd))

      if (command === undefined) {
        // do a fuse search through the commands
        const fuseOpts = {
          keys: ['name', 'description', 'usage', 'aliases'],
          useExtendedSearch: true
        }

        // eslint-disable-next-line new-cap
        const fuse = new Fuse.default(util.commands.array(), fuseOpts)
        const results = fuse.search(args.join(' '))
        const names = results.map((resCmd) => {
          return resCmd.item.name
        })

        return extMsg.inlineReply(`Couldn't find that command. Did you mean: ${names.join(', ')}?`)
      }
      let text = `\`${command.name}\`\n`
      if (command.aliases) {
        text = text.concat(`**Aliases**: \`${command.aliases.join(', ')}\`\n`)
      }
      text = text.concat(`**Description**: ${command.description}\n`)
      text = text.concat(`**Usage**: \`c!${command.usage}\``)
      message.channel.send(text, { split: true })
    }
  }
}
