module.exports = {
  name: 'leaderboard',
  description: 'Get the leaderboard of top slots players across servers.',
  usage: '[leaderboard]',
  aliases: ['lb'],
  cooldown: 5,
  execute (message, args, client, helper) {
    // get the leaderboard organized by scores
    helper.slotsDb.orderByValue().once('value')
      .then(async (snapshot) => {
        const msgs = []
        let msgIndex = 0
        msgs.push('**Slots Leaderboard**\n')
        let i = 1
        await snapshot.forEach(async (user, index, arr) => {
          // need to fetch the actual username from the ID
          // send messages spaced out for char limits
          // since we are building and sending a message string, we need to await
          // results of the promise
          console.log(user.key)
          const fetchedUsr = await client.users.fetch(user.key)
          const newText = msgs[msgIndex].concat(`${i}. ${fetchedUsr.username} - ${user.val().score}`)
          const newLen = msgs[msgIndex].length + newText.length
          if (newLen > 2000) {
            // new message queued
            msgIndex += 1
            msgs.push('')
          } else {
            msgs[msgIndex] = newText
          }
          i++
          if (i === arr.length) {
            // now we send the message
            for (const msg of msgs) {
              if (msg !== '') {
                message.channel.send(msg)
              }
            }
          }
        })
      })
  }
}
