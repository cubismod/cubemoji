module.exports = {
  name: 'search',
  description: 'Search the database for emotes',
  usage: '[search] <emote_name>',
  aliases: ['sch', 's'],
  cooldown: 2,
  requiresCache: true,
  execute (message, args, client, cache) {
    console.log('search used')
    const results = cache.search(args[0])
    if (results.length === 0) {
      message.channel.send(`No results found for your search query \`${args[0]}\``)
    } else {
      // stagger out messages so we don't overdue the 2,000 char msg limit
      const msgs = []
      let msgIndex = 0
      msgs.push(`${results.length} result(s) found for your search query \`${args[0]}\`\n`)
      for (const result of results) {
        const newText = msgs[msgIndex].concat(`\`${result.item.name}\`, `)
        const newLen = msgs[msgIndex].length + newText.length
        if (newLen > 2000) {
          msgIndex += 1
          msgs.push('')
        } else {
          msgs[msgIndex] = newText
        }
      }
      for (const msg of msgs) {
        // don't try and send an empty message to discord
        if (msg !== '') {
          message.channel.send(msg)
        }
      }
    }
  }
}
