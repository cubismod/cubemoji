// helper functions for use in command files

// check image
// returns <image URL, GuildEmoji object representing the emote, false if nothing found>
function checkImage (message, args, client, helper) {
  message.channel.startTyping()
  // check first for a message
  if (message.attachments.size > 0) {
    const attachment = message.attachments.random(1)
    // get the first attachment url and return
    if (Object.prototype.hasOwnProperty.call(attachment[0], 'url')) {
      return attachment[0].url
    }
  }
  // otherwise we check the args
  if (args.length < 1) return false
  // check if a mention or twemoji
  const argName = args[0].toLowerCase()
  const avatarUrl = helper.cache.getAvatar(argName, client)
  const twemoji = helper.cache.parseTwemoji(argName)
  if (avatarUrl || twemoji) {
    if (avatarUrl) return avatarUrl
    else return twemoji.url
  } else {
    // or else try the cache
    const res = helper.cache.retrieve(argName)
    if (!res) {
      // if not that then we search
      const searchRes = helper.cache.search(args[0])
      if (searchRes.length !== 0) {
        return searchRes[0].item
      }
    } else return res.url
  }
  return false
}

module.exports = {
  checkImage
}
