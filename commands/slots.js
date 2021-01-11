const Pand = require('pandemonium')
module.exports = {
  name: 'slots',
  description: 'Play the slots! One point is added for each pair of matches.',
  usage: '[slots]',
  aliases: ['sl'],
  cooldown: 1,
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
        let newScore = points
        helper.slotsDb.once('value')
          .then(snapshot => {
            // check if user exists, if not add them to the database
            const childUser = snapshot.child(message.author.id)
            if (!childUser.exists()) {
              // create user
              helper.slotsDb.child(message.author.id).set({
                score: newScore
              })
            } else {
              // otherwise set their score
              const prevValue = childUser.val().score
              newScore = points + parseInt(prevValue)
              helper.slotsDb.child(message.author.id).set({
                score: newScore
              })
            }
            // then we send out the score
            content.res = content.res.concat(`\n**<a:dieRoll:795419079254605834> Matches: ${points} <a:dieRoll:795419079254605834>.\nYour current score: ${newScore}**`)
            msg.edit(content.res)
          })
          .catch(rejected => console.log(rejected))
      }
    }

    // begin actual code
    const emoteArray = helper.cache.createEmoteArray()
    // get slot options
    // make things more difficult by varying the number of emotes taken
    // for the subset of slots each time
    const slotOptions = Pand.geometricReservoirSample(Pand.random(5, 30), emoteArray)
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
