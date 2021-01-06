module.exports = {
  name: 'slots',
  description: 'Play the slots!',
  usage: '[slots]',
  aliases: ['sl'],
  cooldown: 5,
  requiresCache: true,
  execute (message, args, client, cache) {
    console.log('slots command used')
    // creates text representing slots
    function createSlotText (options) {
      return `${pand.choice(slotOptions)}${pand.choice(slotOptions)}${pand.choice(slotOptions)}`
    }
    // on the 4th iteration we print a result
    function editMsg (msg, iter) {
      let content = createSlotText(slotOptions)
      if (iter === 4) {
        const emotes = content.split(':')
        // split should look something like this
        // [
        //   "<", 0
        //   "amongus", 1
        //   "780838024803254303><",  2
        //   "triCri",  3
        //   "778722027854888991><a", 4
        //   "flushWide", 5
        //   "783113008129245215>", 6
        // ]
        if ((emotes[1] === emotes[3]) &&
        (emotes[3] === emotes[5])) {
          // user won
          content = content.concat(`\n**Congrats you won! ${message.author.username}** <a:dieRoll:795419079254605834>`)
        } else {
          content = content.concat(`\n**Sorry you lost... ${message.author.username}** <a:dieRoll:795419079254605834>`)
        }
      }
      msg.edit(content)
    }

    // begin actual code
    const pand = require('pandemonium')
    const emoteArray = cache.createEmoteArray()
    // get slot options
    // make things more difficult by varying the number of emotes taken
    // for the subset of slots each time
    const slotOptions = pand.geometricReservoirSample(pand.random(5, emoteArray.length), emoteArray)
    const slotsMsg = message.channel.send(createSlotText(slotOptions))
    // edit with the options for 5 times
    slotsMsg.then((sentMsg) => {
      for (let i = 0; i < 5; i++) {
        setImmediate(editMsg, sentMsg, i)
      }
    })
    slotsMsg.catch((reason) => {
      console.log(reason)
    })
  }
}
