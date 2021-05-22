const moment = require('moment')

/**
 * create the actual leaderboard string
 * @param {number} users - the number of users in the game
 * @param {*} snapshot - a snapshot of values in slot db
 * @param {string} type - 'points' or 'min' to display in string
 */
function createLbString (users, snapshot, type) {
  let msg = []
  snapshot.forEach(user => {
    if (Math.round(user.val().timeOnTop / 60) !== 0 || user.val().score !== 0) {
      let score = ''
      switch (type) {
        case 'points':
          score = `${user.val().score} pts`
          break
        case 'min':
          score = `${Math.round(user.val().timeOnTop / 60)} min on top`
          break
      }

      // don't display users with scores of 0 on board
      msg.push(`${users}. ${user.val().username}: ${score}`)
    }
    users--
  })
  msg = msg.reverse()
  return msg.join('\n')
}

/**
 * create a string that is sorted by points/min amassed for an embed
 * @param {number} users - the number of users in the game
 * @param {*} dbRef - a reference to the slots database
 * @param {string} type - 'points' or 'min'
 */
async function sortLb (users, dbRef, type) {
  let order = 'score'
  if (type === 'min') order = 'timeOnTop'
  const snapshot = await dbRef.orderByChild(order).once('value')
  return createLbString(users, snapshot, type)
}

module.exports = {
  name: 'leaderboard',
  description: 'Get the leaderboard of top slots players across servers. https://gitlab.com/cubismod/cubemoji/-/wikis/slots',
  usage: 'leaderboard',
  aliases: ['lb'],
  cooldown: 5,
  execute (message, _args, _client, util) {
    // get the leaderboard organized by scores
    const users = util.slotsUsers.size
    sortLb(users, util.slotsDb, 'points')
      .then(byPoints => {
        sortLb(users, util.slotsDb, 'min')
          .then(byMin => {
            const accent = '```'

            const embed = {
              color: 'DARK_VIVID_PINK',
              title: '<a:dieRoll:795419079254605834> Leaderboard <a:dieRoll:795419079254605834>',
              url: 'https://lb.cubis.codes',
              description: 'Resets occur every 3 days and the user with the highest time on top for that period is declared the winner. You can use `c!steal` to steal points from another user higher on the lb than you and `c!slots` to gain points. Additionally, typing in chat in a server that cubemoji is on will earn you points',
              fields: [
                {
                  name: 'By Points',
                  value: `${accent}\n${byPoints}\n${accent}`
                },
                {
                  name: 'By Minutes',
                  value: `${accent}\n${byMin}\n${accent}`
                }
              ],
              footer: {
                text: `Next leaderboard reset is ${moment().to(util.nextLbReset)}`
              }
            }

            message.channel.send({
              embed: embed
            })
          })
      })
  }
}
