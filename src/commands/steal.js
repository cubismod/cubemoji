require('./../extended-msg')
const Fuse = require('fuse.js')
const Pand = require('pandemonium')
const Discord = require('discord.js')
module.exports = {
  name: 'steal',
  description: 'Attempt to steal from a wealthier player than you. You can wager up to as many points as that player has although be warned that large bets can result in large losses. https://gitlab.com/cubismod/cubemoji/-/wikis/slots',
  usage: '[steal] <username from leaderboard or mention> <wager amount>',
  aliases: ['st'],
  cooldown: 10,
  execute (message, args, client, helper) {
    if (args.length < 2) {
      return message.inlineReply(`You must specify a player and wager amount in the command! \nusage: \`${this.usage}\``)
    }
    const wager = parseInt(args[1])
    if (isNaN(wager) || wager < 0) return message.inlineReply('you must specify a positive integer amount to steal')

    // first we try to see if there's a mention
    let user = helper.cache.parseMention(args[0], client)
    // load up thieves channel to log steals
    client.channels.fetch('800411922499502113').then(thievesChannel => {
      helper.slotsDb.orderByChild('username').once('value')
        .then(snapshot => {
          let victimUsername
          if (!user) {
          // if we didn't find a mention, then we perform
          // a fuzzy search on the usernames
          // construct a fuse search object
            const options = {
              keys: ['username'],
              threshold: 0.3,
              useExtendedSearch: true
            }
            const users = snapshot.toJSON()
            const userArray = []
            // to get this json obj to work with fuse, we need to convert the dict to an
            // array unfortunately
            Object.keys(users).forEach(key => userArray.push({ id: key, username: users[key].username }))
            // then perform the search
            const search = new Fuse(userArray, options)
            // second arg specifies we only want one result
            const results = search.search(args[0], 1)
            if (results.length < 1) return message.inlineReply('no user found matching that name!')
            // in the end we only care about the id
            user = results[0].item.id
            victimUsername = results[0].item.username
          } else {
            victimUsername = user.username.slice()
            user = user.id
          }
          // now at this point we should have the ID of the user we are looking for
          // check to ensure the user is not trying to steal from themeslves
          if (user === message.author.id) return message.inlineReply('you can\'t steal from yourself!')
          // then double check to ensure that the victim is on the leaderboard
          const victim = snapshot.child(user)
          if (!victim.exists()) return message.inlineReply('that user is not on the leaderboard!')
          const victimScore = victim.val().score
          const player = snapshot.child(message.author.id)
          if (!player.exists()) return message.inlineReply('you are not on the leaderboard! Start playing with `c!slots` to gain points')
          const playerScore = player.val().score

          const ratioOnTop = player.val().timeOnTop / 2.592e+8
          if (playerScore > victimScore) return message.inlineReply(`you have ${playerScore} points and thus can't steal from your victim who has ${victimScore} points! Unlike real life, the wealthy here can't steal from the poor.`)
          if (wager > victimScore) return message.inlineReply(`you can't steal more points than your victim has, they have ${victimScore} points`)
          // now comes the fun part where we determine how successful the steal will be
          // users are more likely to win a steal if they are waging less on the steal
          // sometimes get a value between the min amount to get above score or the victim's total score
          const stealChance = Pand.random(0, Pand.choice([victimScore, (victimScore - playerScore) + 5]))
          // have to get a new reference to the player to update their value
          const playerWriteable = helper.slotsDb.child(message.author.id)

          const promo = ['Watch live steals here', 'https://discord.gg/SjXbFbyVwf']
          if (stealChance < Math.round((1 - ratioOnTop) * wager)) {
            // unsuccessful steal
            const lossAmount = Math.min(wager, stealChance, Math.round(playerScore * Pand.randomFloat(0, 1)))
            playerWriteable.update({ score: playerScore - lossAmount })

            const thiefEmbed = new Discord.MessageEmbed()
              .setColor('RED')
              .setTitle(`${message.author.username} lost ${lossAmount} points when trying to steal from ${victimUsername}`)
            thievesChannel.send(thiefEmbed)

            const inlineReplyEmbed = new Discord.MessageEmbed()
              .setColor('RED')
              .setDescription(`${message.author}, your steal was unsuccessful and you lost ${lossAmount} points. Your new score is ${playerScore - lossAmount}`)
              .setTitle('Steal Unsuccessful')
              .addField(promo[0], promo[1])

            return message.inlineReply(inlineReplyEmbed)
          } else {
          // successful steal
            const victimWriteable = helper.slotsDb.child(user)
            const stealAmount = Math.min(wager, Pand.random(0, victimScore))
            victimWriteable.update({ score: victimScore - stealAmount })
            playerWriteable.update({ score: playerScore + stealAmount })

            const thiefEmbed = new Discord.MessageEmbed()
              .setColor('BLURPLE')
              .setTitle(`${message.author.username} stole ${stealAmount} points from ${victimUsername}`)
            thievesChannel.send(thiefEmbed)

            if (stealAmount !== wager) {
              // the player will steal some of what the other player had
              const inlineReplyEmbed = new Discord.MessageEmbed()
                .setColor('YELLOW')
                .setDescription(`${message.author}, partially successful steal from <@${user}> of ${stealAmount} points. You now have ${playerScore + stealAmount} points while they have ${victimScore - stealAmount} points.`)
                .setTitle('Steal Partially Successful')
                .addField(promo[0], promo[1])

              return message.inlineReply(inlineReplyEmbed)
            } else {
            // the player steals that full amount
              const inlineReplyEmbed = new Discord.MessageEmbed()
                .setColor('GREEN')
                .setDescription(`${message.author}, successful steal from <@${user}> of ${stealAmount} points. You now have ${playerScore + stealAmount} while they have ${victimScore - stealAmount} points.`)
                .setTitle('Steal Successful')
                .addField(promo[0], promo[1])

              return message.inlineReply(inlineReplyEmbed)
            }
          }
        })
        .catch(err => {
          // db snapshot failed
          console.error(err)
        })
    })
  }
}
