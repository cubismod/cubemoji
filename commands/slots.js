module.exports = {
  name: 'slots',
  description: 'Play the slots!',
  usage: '[slots]',
  aliases: ['sl'],
  cooldown: 30,
  requiresCache: true,
  execute (message, args, client, cache) {
    // creates text representing slots
    function createSlotText (options) {
      return `${pand.choice(slotOptions)}${pand.choice(slotOptions)}${pand.choice(slotOptions)}`
    }
    function editMsg (msg) {
      msg.edit(createSlotText(slotOptions))
    }
    async function finalResult (headerMsg, emoteMsg) {
      // this is a promise so we have to do some async code
      const emoteContent = await emoteMsg
      const headerContent = await headerMsg
      const emotes = emoteContent.content.split('<')
      // split should look like this
      // 1, 2, 3 contain raw emote values
      if (emotes[1] === emotes[2] === emotes[3]) {
        // user want
        headerContent.edit('**Congrats you won!**')
      }
      else {
        headerContent.edit('**Sorry you lost!**')
      }
    }
    const pand = require('pandemonium')
    const emoteArray = cache.createEmoteArray()
    // get slot options
    const slotOptions = pand.geometricReservoirSample(15, emoteArray)
    const headerMsg = message.channel.send('**Your slots <a:dieRoll:795419079254605834>**')
    const slotsMsg = message.channel.send(createSlotText(slotOptions))
    // edit with the options for 5 times
    slotsMsg.then((sentMsg) => {
      for (let i=1; i < 5; i++) {
        setTimeout(editMsg, 500*i, sentMsg)
      }
      // last frame we decide on a result
      // after 3000 ms
      setTimeout(finalResult, 2500, headerMsg, slotsMsg)
    })
    slotsMsg.catch((reason) => {
      console.log(reason)
    })
  }
}
