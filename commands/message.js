module.exports = {
  name: 'message',
  description: 'Send a message to the ether which will be received by another random person looking for a soulmate 🥺',
  usage: '[message] <text>',
  aliases: ['m', 'msg'],
  cooldown: 1,
  execute (message, args, client, helper) {
    // resolve and send a message to a user using their ID
    function sendMsg (id, text) {
      client.users.fetch(id).then(receiver => {
        receiver.send(`*Incoming Message*: ${text}`)
        console.log(`${message.author.tag} sent "${text}" to ${receiver.tag}`)
      }).catch(rej => console.error(rej))
    }
    // begin actual code
    if (message.channel.type !== 'dm') {
      return message.reply('you can only use this command in DMs!')
    }
    if (args.length < 1) {
      console.log(`${message.author.username} failed to use ${this.name} correctly`)
      message.reply(`you must specify a message!\n \`${this.usage}\``)
    } else {
      const Pandemonium = require('pandemonium')
      const text = args.join(' ')
      // the user has already entered the matching pool
      const matches = Object.keys(helper.matches)
      if (matches.length !== 0 && matches.includes(message.author.id)) {
        const sender = helper.matches[message.author.id]
        if (sender.matched === true) {
          // end and reporting features
          if (args[0].toLowerCase() === 'end') {
            // end the chat now
            message.author.send('Chat has ended now. Have a great day!')
            console.log(`Conversation between ${message.author.id} & ${sender.match} has ended`)
            delete helper.matches[message.author.id]
            delete helper.matches[sender.match]
          } else if (args[0].toLowerCase() === 'report') {
            message.author.send('Your conversation has ended and been reported')
            console.error(`Conversation between ${message.author.id} & ${sender.match} has been reported!`)
            delete helper.matches[message.author.id]
            delete helper.matches[sender.match]
          } else {
            // there is a match so we can send a message now
            // now load up the receiving user
            sendMsg(sender.match, text)
          }
        } else {
          // no matches yet
          helper.matches[message.author.id].msg = text
          return message.reply('we have added you to the matching queue and will let you know once we find a match for you!')
        }
      } else {
        // user is not yet on the queue so let's add them
        helper.matches[message.author.id.toString()] = { matched: false, match: '', msg: text }
        const users = Object.keys(helper.matches)
        // we have found a match
        // create an array w/o the original sender in it
        const senderID = message.author.id
        const index = users.indexOf(senderID)
        users.splice(index, 1)
        users.forEach((user, i, arr) => {
          // remove any users who may be matched
          if (user.matched) arr.splice(i, 1)
        })
        // check if there is a match possible
        if (users.length < 1) {
          // no matches
          return message.reply('no matches available yet, we will let you know when we find one!')
        }
        const recieverID = Pandemonium.choice(users)
        // now we have identified a user, so lets match each up
        // first on the sender side
        helper.matches[senderID].match = recieverID
        helper.matches[senderID].matched = true
        // then on the receiver side
        helper.matches[recieverID].match = senderID
        helper.matches[recieverID].matched = true
        message.author.send('We found a match for you! You will now be able to chat for 15 minutes before the conversation closes. Please keep in mind that chats are moderated by cubis, the bot owner, who will see all messages and usernames. Additionally if you want to end a chat you can use `c!message end` and if you want to report a chat (which will close it), use `c!message report`. Enjoy!')
        // now resolve the other user and send them a msg
        sendMsg(helper.matches[senderID].match, helper.matches[senderID].msg)

        // then we setup a timeout to stop the convo after 15 minutes
        const endMsg = 'Thanks for chatting! Your conversation is done now.'
        setTimeout(function () {
          message.author.send(endMsg)
          sendMsg(recieverID, endMsg)
          // delete references to the users
          delete helper.matches[senderID]
          delete helper.matches[recieverID]
        }, 900000)
      }
    }
  }
}

/* The user is added to a queue to find other users to match with
They receive a dm when they are matched.
They then will have 15 minutes to anonymously message with the user, at the end the
conversation will be terminated and usernames will be revealed. */
