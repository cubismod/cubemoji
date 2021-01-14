module.exports = {
  name: 'leaderboard',
  description: 'Get the leaderboard of top slots players across servers.',
  usage: '[leaderboard]',
  aliases: ['lb'],
  cooldown: 5,
  execute (message, args, client, helper) {
    // get the leaderboard organized by scores
    helper.slotsDb.orderByChild('score').once('value')
      .then(async (snapshot) => {
        const msgs = []
        snapshot.forEach(user => {
          // for each snapshot we will add onto an array of scores
          msgs.push(`\`${user.val().username}\` - ${user.val().score} points`)
        })
        // then we reverse this list of msgs since we need sorting hi-lo scores
        msgs.reverse()
        let charCount = 0
        let msgStr = '<a:dieRoll:795419079254605834> ** Slots Leaderboard ** <a:dieRoll:795419079254605834>\n'
        for (let i = 0; i < msgs.length; i++) {
          if (msgs[i].length + charCount > 2000) {
            // split out the message into multiple messages if needed
            client.channel.send(msgStr)
            msgStr = 0
            charCount = 0
          } else {
            if (msgs[i].indexOf(message.author.username) !== -1) {
              msgStr = msgStr.concat(`**${i + 1}. ${msgs[i]}**\n`)
            } else {
              // bold the user's name so they know where they placed
              msgStr = msgStr.concat(`${i + 1}. ${msgs[i]}\n`)
            }
          }
        }
        // send out a message if it hasn't already been sent
        if (msgStr !== '') {
          message.channel.send(msgStr)
        }
        // send user's placement
      })
  }
}
