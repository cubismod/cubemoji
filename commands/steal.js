const Fuse = require('fuse.js')
module.exports = {
  name: 'steal',
  description: 'Attempt to steal from a wealthier player than you. You can only wager as many points as you currently have.',
  usage: '[steal] <username from leaderboard or mention> <wager amount>',
  aliases: ['st'],
  cooldown: 10,
  execute (message, args, client, helper) {
    if (args.length < 2) {
      return message.reply(`You must specify a player and wager amount in the command! \nusage: \`${this.usage}\``)
    }
    // first we try to see if there's a mention
    let user = helper.cache.parseMention(args[0], client)
    // if not, we load up the results from the db
    helper.slotsDb.orderByChild('username').once('value')
      .then(snapshot => {
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
          if (results.length < 1) return message.reply('no user found matching that name!')
          // in the end we only care about the id
          user = results[0].item.id
        } else user = user.id
        // now at this point we should have the ID of the user we are looking for
        // check to ensure the user is not trying to steal from themeslves
        if (user === message.author.id) return message.reply('you can\'t steal from yourself!')
        // then double check to ensure that user is on the leaderboard
        const childUser = snapshot.child(user)
        if (!childUser.exists()) return message.reply('that user is not on the leaderboard!')
      })
    // then see if there's a direct match, if not we do a fuzzy search
    // if we have a result continue otherwise error out
    // see if user is able to perform the steal based on the difference of points between the two
    // if they are continue
    // determine a success rate of how much the user can steal
    // user performs steal, decrementing other person's points and adding to their own total
  }
}
