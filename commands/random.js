module.exports = {
  name: 'random',
  description: 'Insert a random emote!',
  usage: '[random]',
  aliases: ['r', 'rnd'],
  requiresCache: true,
  execute (message, args, client, cache) {
    // first we get a random number
    const emoteArray = cache.createEmoteArray()
    const randomNumber = Math.floor(Math.random() * emoteArray.length)
    message.channel.send(emoteArray[randomNumber].toString())
  }
}
