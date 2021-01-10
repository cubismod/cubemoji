const Pand = require('pandemonium')
module.exports = {
  name: 'slots',
  description: 'Play the slots! One point is added for each pair of matches.',
  usage: '[slots]',
  aliases: ['sl'],
  cooldown: 2,
  execute (message, args, client, helper) {
    console.log('slots command used')
    // creates text representing slots
    function createSlotText (options) {
      const emotes = Pand.sampleWithReplacements(20, options)
      let res = ''
      emotes.forEach(emote => {
        res = res.concat(emote)
      })
      return {
        res,
        emotes
      }
    }
    function editMsg (msg, iter, options) {
      const content = createSlotText(options)
      if (iter === 2) {
        // on the 3rd iteration we print a result
        // points are determined if the previous emote and current emote are the same
        let points = 0
        content.emotes.forEach((emote, index, arr) => {
          if (index > 0) {
            const prevEmote = arr[index - 1]
            if (emote === prevEmote) {
              points++
            }
          }
        })
        content.res = content.res.concat(`\n**<a:dieRoll:795419079254605834> Matches: ${points} <a:dieRoll:795419079254605834>**`)
      }
      msg.edit(content.res)
    }

    // begin actual code
    const emoteArray = helper.cache.createEmoteArray()
    // get slot options
    // make things more difficult by varying the number of emotes taken
    // for the subset of slots each time
    const slotOptions = Pand.geometricReservoirSample(Pand.random(1, 40), emoteArray)
    const slotsRet = createSlotText(slotOptions)
    const slotsMsg = message.channel.send(slotsRet.res)
    // edit with the options for 5 times
    slotsMsg.then((sentMsg) => {
      for (let i = 0; i < 3; i++) {
        // TODO: investigate whether worker pooling would provide better performance
        setImmediate(editMsg, sentMsg, i, slotOptions)
      }
    })
    slotsMsg.catch((reason) => {
      console.log(reason)
    })
  }
}
