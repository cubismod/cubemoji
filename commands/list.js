module.exports = {
  name: 'list',
  description: 'List available emotes in a DM',
  usage: '[list]',
  aliases: ['l'],
  cooldown: 120,
  execute (message, args, client, helper) {
    const msg = []
    const emoteArray = helper.cache.createEmoteArray(true)
    let letter = ''
    emoteArray.forEach(emote => {
      // split lines by
      if ((emote[0]).toUpperCase() !== letter) {
        letter = emote[0].toUpperCase()
        msg.push(`\n**${letter}: **`)
      }
      msg.push(`\`${emote}\``)
    })
    const msgStr = msg.join(' ')
    message.channel.send("I'm sending you a DM with the list of emotes! If you didn't get it then check your privacy settings on Discord.")
    message.author.send(`**Emote List**\nType \`c!emote <emote_name>\` in this chat to see a specific emote)\nType \`c!info <emote_name>\` for more info about a specific emote\n${msgStr}\n`, { split: true })
  }
}
