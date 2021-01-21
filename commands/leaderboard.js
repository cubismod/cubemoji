const Discord = require('discord.js')
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
        let count = 0
        // since we store a reference to how many users are playing, we can
        // use that as an index to show user scores
        let rank = helper.slotsUsers.size
        let embed
        let players = []
        snapshot.forEach(user => {
          if (user.val().score !== 0) {
            // don't display users with scores of 0 on board
            if (count === 0) {
              // create a new embed obj
              embed = new Discord.MessageEmbed()
                .setTitle('<a:dieRoll:795419079254605834> Leaderboard <a:dieRoll:795419079254605834>')
                .setColor('BLUE')
                .setFooter('Users with scores of zeroes are omitted from the leaderboard.\nThe user with the highest time on top (in #1 spot) wins for the week.\nTime on top scores are updated once another user overtakes them in the top position.')
            }
            if (count < 25) {
              // max of 25 fields in an embed
              players.push({ name: `# ${rank}`, value: `${user.val().username}: **${user.val().score} pts**\nTime on Top ${user.val().timeOnTop} s` })
              // indicate the score to the player
              if (message.author.id === user.key) {
                embed.setDescription(`${message.author}, your score is **${user.val().score} pts**`)
              }
            } else {
              // need to reverse our list as firebase returns in ascending order
              embed.addFields(players.reverse())
              message.channel.send({ embed: embed })
              count = 0
              players = []
            }
            count++
          }
          rank--
        })
        if (count !== 0) {
          embed.addFields(players.reverse())
          message.channel.send({ embed: embed })
        }
      })
  }
}
