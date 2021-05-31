require('./../extended-msg')
const Discord = require('discord.js')
module.exports = {
  name: 'search',
  description: 'Search the database for emotes https://gitlab.com/cubismod/cubemoji/-/wikis/commands/search',
  usage: 'search <emote_name>',
  aliases: ['sch', 's'],
  cooldown: 2,
  execute (message, args, _client, helper) {
    if (args.length < 1) {
      return message.inlineReply(`you must specify a query to search for \nusage: \`${this.usage}\``)
    }

    const query = args.join(' ')

    const results = helper.cache.search(query)
    if (results.length === 0) {
      message.channel.send(`No results found for your search query \`${args[0]}\``)
    } else {
      const description = []
      results.forEach((result) => {
        // try to avoid going over message limit
        if (results.length > 50) description.push(`\`${result.item.name}\` `)
        else description.push(`${result.item} \`${result.item.name}\` `)
      })
      const embed = new Discord.MessageEmbed()
        .setTitle(`Search for ${query} (${results.length})`)
        .setDescription(description.join('  ').slice(0, 2047))
        .setColor('BLUE')
        .setFooter('Searching yielding tons of results will be truncated. Use c!list to get a list of all emotes to your DMs.')
      message.channel.send({ embed: embed })
    }
  }
}
