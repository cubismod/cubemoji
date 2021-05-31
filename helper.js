// helper functions typically used in index.js
const Pandemonium = require('pandemonium')
const fs = require('fs')
const path = require('path')
const whitelist = require('./whitelist.json')
const moment = require('moment')

/**
 * set the status of the bot and also clean out the temporary image directory
 * performed every 30 to 90 minutes
 * @param {object} util - dictionary including a lot of helper functions and database code initialized in index.js
 * @param {Discord.Client} client - reference to the Discord client
 */
function setStatus (util, client) {
  const emotes = util.cache.createEmoteArray(true)
  const msg = `c!help :${Pandemonium.choice(emotes)}:`
  if (client.user != null) client.user.setActivity(msg, { type: 'WATCHING' })

  // we also take this as an opportunity to clear out the downloaded
  // images folder
  const dir = './download/'
  fs.readdir(dir, (err, files) => {
    if (err) console.error(err)
    files.forEach(file => {
      fs.unlink(path.join(dir, file), err => {
        if (err) console.error(err)
      })
    })
  })
}

/**
 * checks whether a command is allowed in a specific channel to avoid spam
 * @param {Discord.Channel} channel - the channel that we are checking if it is on the whitelist
 * @param {string} commandName - the command we are checking like leaderboard, or slots for example
 * @returns {boolean} - t if command allowed in channel, f if command disallowed in channel
 */
function checkWhiteList (channel, commandName) {
  /* so the command whitelist JSON file is organized like so:
  {
    (server id) {
      (command name) {
        (channel id)
      }
    }
  }
  channel whitelists are per server
  */

  if (channel.type !== 'dm') {
    if (Object.prototype.hasOwnProperty.call(whitelist, channel.guild.id)) {
      if (Object.prototype.hasOwnProperty.call(whitelist[channel.guild.id], commandName)) {
        if (Object.prototype.hasOwnProperty.call(whitelist[channel.guild.id][commandName], channel.id)) {
          return true
        }
      } else {
        return true
      }
    } else {
      return true
    }
    return false
  }
  return true
}

/**
 * adds a point whenever a user sends a message in a channel cubemoji has access to
 * @param {object} util - utility object from index.js
 * @param {Discord.User} user - the user who sent the message
 */
function ambPointAdd (util, user) {
  if (util.slotsUsers.has(user.id) &&
  Pandemonium.choice([true, false])) {
    util.slotsDb.once('value')
      .then(snapshot => {
        const childUser = snapshot.child(user.id)
        if (childUser.exists()) {
          const prevVal = childUser.val().score
          const newScore = prevVal + Pandemonium.random(1, 40)
          util.slotsDb.child(user.id).update({
            score: newScore,
            username: user.username
          })
        }
      })
      .catch(err => {
        // unable to get a snapshot of the db
        console.error(err)
      })
  }
}

/**
 * calculate how long a player has been on the top from the current time
 * @param {object} util - utility object from index.js
 * @returns the difference in time in ms
 */
function calcTimeDiff (util) {
  const curTime = new Date()
  // saving in seconds
  const diff = (Math.abs(curTime - util.beginTop)) / 1000
  // save that value
  return util.topPlayerTime + diff
}

/**
 * perform a leaderboard reset automatically
 * @param {object} util - utility object from index.js
 * @param {Discord.Client} client - reference to the Discord client
 */
function resetLb (util, client) {
  // first we need to determine whether a reset is pending (aka the bot has been restarted)
  util.cmSettings.once('value').then(snapshot => {
    // snapshot has a reference to the nextResetTime var now
    const jsonVer = snapshot.toJSON().nextResetTime
    const resetParsed = parseInt(jsonVer)
    if (!isNaN(resetParsed)) {
      // this indicates that a valid number was stored in that variable
      const diff = resetParsed - Date.now()
      if (diff > 0 && diff < 2.592e+8 && util.queuedForReset === false) {
        // this indicates that it is not yet time for a reset
        // so we queue up another timeout for this to happen
        setTimeout(resetLb, diff, util, client)
        util.queuedForReset = true
        util.nextLbReset = resetParsed
      } else {
        // helper.resetLb, 15000, util, client) trigger a reset
        client.channels.fetch('799767869465428050').then(slotsChannel => {
          slotsChannel.send('The slots leaderboard has been reset! Next reset will be in 72 hours...').then(msg => {
            // print out leaderboard message
            client.commands.get('leaderboard').execute(msg, null, null, util)
            // modify the reset time
            const nextLbReset = Date.now() + 2.592e+8
            // save that value to db
            util.cmSettings.update({
              nextResetTime: nextLbReset
            })
            util.nextLbReset = nextLbReset
            // reset top player stats
            util.topPlayer = ''
            util.beginTop = ''
            util.topPlayerTime = ''
            // clear the acutal leaderboard now
            util.slotsDb.once('value').then(snapshot => {
              snapshot.forEach(user => {
                util.slotsDb.child(user.key).update({
                  score: 0, timeOnTop: 0
                })
              })
            })
          })
        })
      }
    } else {
      // something went wrong... so lets setup a new reset for 1 minute from now
      const resetTime = moment().add(1, 'minute')
      util.cmSettings.update({
        nextResetTime: resetTime
      })
      setTimeout(resetLb, 60000, [util, client])
    }
  }, reason => {
    console.error(reason)
  })
}

function getSpecialEvent () {
  const curMon = new Date().getMonth()
  switch (curMon) {
    case 6:
      return 'pride'
  }
}

module.exports = {
  setStatus,
  checkWhiteList,
  ambPointAdd,
  calcTimeDiff,
  resetLb,
  getSpecialEvent
}
