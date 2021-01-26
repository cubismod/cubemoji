const moment = require('moment')
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
        // since we store a reference to how many users are playing, we can
        // use that as an index to show user scores
        let rank = helper.slotsUsers.size
        let msg = []
        // push footer information
        msg.push('*Users with scores of zeroes are omitted from the leaderboard.\nThe user with the highest time on top (in #1 spot) wins for the week.\nOnline Leaderboard: <https://lb.cubis.codes>*')
        snapshot.forEach(user => {
          if (user.val().score !== 0) {
            // don't display users with scores of 0 on board
            msg.push(`${rank}. \`${user.val().username}\`: **${user.val().score}** pts, **${moment.duration(user.val().timeOnTop, 'seconds').humanize()}** on top`)
          }
          rank--
        })
        // push the header msg
        msg.push('<a:dieRoll:795419079254605834> Leaderboard <a:dieRoll:795419079254605834>')
        // reverse all of this since we were iterating in ascending order and we want a descending result
        msg = msg.reverse()
        message.channel.send(msg.join('\n'), { split: true })
      })
  }
}
