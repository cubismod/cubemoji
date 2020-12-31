module.exports = {
  name: 'list',
  description: 'List available emotes, defaults to printing out all the emotes in well, emote',
  usage: '[list] (optional)[both|text]',
  requiresCache: true,
  cooldown: 30,
  execute (message, args, client, cache) {
    console.info('list command used')
    const msgs = []
    let msgIndex = 0
    // const helper = require('./../helper')
    const emoteArray = cache.createEmoteArray().sort()
    msgs.push('')
    for (const emote of emoteArray) {
      // don't overload discord msg limit of 2000 chars
      const newText = msgs[msgIndex].concat(`\`${emote.name}\`, `)
      const newLen = msgs[msgIndex].length + newText.length
      if (newLen > 2000) {
        // queue up another msg
        msgIndex += 1
        msgs.push('')
      } else {
        msgs[msgIndex] = newText
      }
    }
    message.channel.send("I'm sending you a DM with the list of emotes! If you didn't get it then check your privacy settings on Discord.")
    message.author.send('**Emote List (you can type c!emote <emote_name> in this chat to see a specific emote)**')
    for (const msg of msgs) {
      // don't try and send an empty message to discord
      if (msg !== '') {
        message.author.send(msg)
      }
    }
  }
}
