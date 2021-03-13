const Pandemonium = require('pandemonium')
module.exports = {
  name: 'tmoji',
  description: 'Replaces the string you send with the emote versions. If an emote is not matched, then it won\'t result in an emote being printed.',
  usage: 'tmoji <emote_name> <emote_name> ...',
  execute (message, args, client, helper) {
    const emList = []
    args.forEach(element => {
      // do a search for each arg
      const res = helper.cache.search(element)
      if (res.length > 0) {
        // found a match
        const match = Pandemonium.choice(res)
        emList.push(match.item)
      }
    })
    if (emList.length > 0 && emList.length < 41) {
      // try and delete the message and send the embed
      try {
        message.delete()
      } catch {
        console.log(`Unable to delete message ${message.url}`)
      }
      message.channel.send(`*${message.author.username} says*`)
      message.channel.send(emList.join(''))
    }
    else {
      message.react('❌')
    }
  }
}
