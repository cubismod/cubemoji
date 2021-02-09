module.exports = {
  name: 'message',
  description: 'Send a message to the ether which will be received by another random person looking for a soulmate 🥺',
  usage: '[message] <text>',
  aliases: ['m', 'msg'],
  cooldown: 1,
  execute (message, args, client, helper) {
    // resolve and send a message to a user using their ID
    function sendMsg (id, text, system = false) {
      let prefix = '*Incoming Message*: '
      if (system) prefix = '*System Message*: '
      client.users.fetch(id).then(receiver => {
        receiver.send(`${prefix} ${text}`)
        console.log(`${message.author.tag} sent "${text}" to ${receiver.tag}`)
        if (!system) {
          client.channels.fetch('808511506442485801').then(ramblings => {
            ramblings.send(text)
          })
        }
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
          switch (args[0].toLowerCase()) {
            case '!end':
              // end the chat now
              message.author.send('Chat has ended now. Have a great day!')
              sendMsg(sender.match, 'The conversation has ended.', true)
              console.log(`Conversation between ${message.author.id} & ${sender.match} has ended`)
              // clear out timeouts
              try {
                clearTimeout(helper.matches[message.author.id].timeout)
                clearTimeout(helper.matches[sender.match].timeout)
              } catch {
                console.log('oops!')
              }

              delete helper.matches[message.author.id]
              delete helper.matches[sender.match]
              break
            case '!report':
              message.author.send('Your conversation has ended and been reported')
              sendMsg(sender.match, 'Conversation has ended', true)
              // clear out timeouts
              try {
                clearTimeout(helper.matches[message.author.id].timeout)
                clearTimeout(helper.matches[sender.match].timeout)
              } catch {
                console.log('oops!')
              }

              console.error(`Conversation between ${message.author.id} & ${sender.match} has been reported!`)
              delete helper.matches[message.author.id]
              delete helper.matches[sender.match]
              break
            case '!id':
              // reveal the users ID
              helper.matches[message.author.id].id = true
              if (helper.matches[sender.match].id === true) {
                message.author.send(`turns out you are chatting with <@${sender.match}>`)
                sendMsg(sender.match, `turns out you are chatting with <@${message.author.id}>`, true)
              }
              break
            default:
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
        // we have found a match
        // create an array w/o the original sender in it
        const senderID = message.author.id
        if (helper.openUsers.size === 0) {
          helper.openUsers.add(senderID)
          return message.reply('no matches available yet, we will let you know when we find one!')
        }
        const receiverID = Pandemonium.choice(Array.from(helper.openUsers))
        // now we have identified a user, so lets match each up
        // first on the sender side
        helper.matches[senderID].match = receiverID
        helper.matches[senderID].matched = true
        // then on the receiver side
        helper.matches[receiverID].match = senderID
        helper.matches[receiverID].matched = true
        // remove both matches from there
        helper.openUsers.delete(senderID)
        helper.openUsers.delete(receiverID)
        const welcomeMsg = 'We found a match for you! You will now be able to chat for 15 minutes before the conversation closes. Please keep in mind that chats are moderated by cubis, the bot owner, who will see all messages and usernames. Additionally if you want to end a chat you can use `!end` and if you want to report a chat (which will close it), use `!report`. Use `!id` to reveal your ID 😉. Enjoy!'
        message.author.send(welcomeMsg)
        sendMsg(receiverID, welcomeMsg, true)
        // now resolve the other user and send them a msg
        sendMsg(helper.matches[senderID].match, helper.matches[senderID].msg)

        // then we setup a timeout to stop the convo after 15 minutes
        const endMsg = 'Thanks for chatting! Your conversation is done now.'
        const timeout = setTimeout(function () {
          sendMsg(receiverID, endMsg, true)
          // delete references to the users
          delete helper.matches[senderID]
          delete helper.matches[receiverID]
        }, 900000)
        helper.matches[senderID].timeout = timeout
        helper.matches[receiverID].timeout = timeout
      }
    }
  }
}

/* The user is added to a queue to find other users to match with
They receive a dm when they are matched.
They then will have 15 minutes to anonymously message with the user, at the end the
conversation will be terminated and usernames will be revealed. */
