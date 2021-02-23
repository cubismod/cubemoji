module.exports = {
  name: 'message',
  description: 'Send a message to the ether which will be received by another random person looking for a soulmate 🥺 https://gitlab.com/cubismod/cubemoji/-/wikis/Chat',
  usage: 'message <text>',
  aliases: ['m', 'msg'],
  cooldown: 1,
  execute (message, args, client, helper) {
    const Moment = require('moment')
    const Pandemonium = require('pandemonium')

    // resolve and send a message to a user using their ID
    function sendDM (id, text, system = false) {
      const userObj = helper.matches[id]
      let prefix = `*Chat ends ${Moment().to(userObj.timeLeft)}:*`
      if (system) prefix = '*System Message*: '
      client.users.fetch(id).then(receiver => {
        receiver.send(`${prefix} ${text}`)
        console.log(`${message.author.tag} sent "${text}" to ${receiver.tag}`)
        if (!system) {
          // send a ramble
          const rambleBody = `${userObj.emote.toString()}: ${text}`
          sendRamble(rambleBody)
        }
      }).catch(rej => console.error(rej))
    }

    // ramble signifying two users have left the chat
    // only need one user as we can pull the emote from the other user
    function chatEndRamble (user) {
      const userOneEmote = user.emote.toString()
      const userTwoEmote = helper.matches[user.match].emote
      const msg = `*${userOneEmote} & ${userTwoEmote} have left the chat*`
      sendRamble(msg)
    }

    // sends a rambling message to be posted to the log
    function sendRamble (text) {
      client.channels.fetch('808511506442485801').then(ramblings => {
        ramblings.send(text).then(message => {
          // clear ramblings messages after 10 hours
          setTimeout(function () {
            try {
              message.delete()
            } catch (err) {
              // log an error but also not super important if we can't delete
              console.log(err)
            }
          }, 3.6e+7)
        })
      })
    }

    // clean up the chat and related objects once its done
    function cleanupChat () {
      const sender = helper.matches[message.author.id]
      const receiver = helper.matches[sender.match]
      // first we remove those timeouts
      try {
        clearTimeout(sender.timeout)
        clearTimeout(receiver.timeout)
      } catch {
        console.log('we were unable to clear timeout(s) as they had been deleted already')
      }
      // then we delete the actual objects
      delete helper.matches[message.author.id]
      delete helper.matches[sender.match]
    }

    // convert a user object to be matched
    function makeMatch (sender, receiver) {
      helper.matches[sender].match = receiver
      // remove from available pool of matches
      helper.openUsers.delete(sender)
      // pick an emote to represent them in chat
      helper.matches[sender].emote = Pandemonium.choice(helper.cache.createEmoteArray())
      // store when the chat will end so its shows up in dms
      const timeLeft = Moment().add(15, 'minutes')
      helper.matches[sender].timeLeft = timeLeft
      helper.matches[sender].matched = true
    }

    // begin actual code
    // initial command checks
    if (message.channel.type !== 'dm') return message.reply('you can only use this command in DMs!')
    if (args.length < 1) {
      console.log(`${message.author.username} failed to use ${this.name} correctly`)
      message.reply(`you must specify a message!\n \`${this.usage}\``)
    } else {
      const chatEnded = 'Chat has ended now. Have a great day!'
      const lookingForMatch = 'we have added you to the matching queue and will let you know once we find a match for you! You can type `!leave` to leave the queue.'
      const matchRamble = '*A user is looking for someone to chat with... Will you answer their call and join the queue?*'

      // merge args back into a message
      const text = args.join(' ')
      const matches = Object.keys(helper.matches)
      if (matches.length !== 0 && matches.includes(message.author.id)) {
        // the user has already entered the matching pool
        const sender = helper.matches[message.author.id]
        if (sender.matched === true) {
          // several argument commands are available to control the chat
          switch (args[0].toLowerCase()) {
            case '!end':
              // end the chat now
              message.author.send(chatEnded)
              sendDM(sender.match, chatEnded, true)
              chatEndRamble(sender)
              console.log(`Conversation between ${message.author.id} & ${sender.match} has ended`)
              cleanupChat()
              break
            case '!report':
              message.author.send('Your conversation has ended and been reported')
              sendDM(sender.match, chatEnded, true)
              // clear out timeouts
              console.error(`Conversation between ${message.author.id} & ${sender.match} has been reported!`)
              cleanupChat()
              break
            case '!id':
              // reveal the users ID
              helper.matches[message.author.id].id = true
              if (helper.matches[sender.match].id === true) {
                message.author.send(`turns out you are chatting with <@${sender.match}>`)
                sendDM(sender.match, `turns out you are chatting with <@${message.author.id}>`, true)
              } else {
                message.channel.send('You have revealed your ID, if your match reveals their ID, then a message will be sent indicating who you are chatting with.')
                sendDM(sender.match, 'Your match has revealed their ID. You can reveal yours with `!id`', true)
              }
              break
            default:
              sendDM(sender.match, text)
          }
        } else {
          // no matches yet
          if (args[0].toLowerCase() === '!leave') {
            // remove user from the queue
            sendRamble('*Someone got tired of waiting so left the queue.*')
            delete helper.matches[message.author.id]
            helper.openUsers.delete(message.author.id)
            return message.reply('You have been removed from the queue.')
          }
          helper.matches[message.author.id].msg = text
          sendRamble(matchRamble)
          return message.reply(lookingForMatch)
        }
      } else {
        // create a user object
        helper.matches[message.author.id.toString()] = { matched: false, match: '', msg: text }
        const senderID = message.author.id
        if (helper.openUsers.size === 0) {
          // no matches found yet so let's announce that to spark interest
          helper.openUsers.add(senderID)
          sendRamble(matchRamble)
          return message.reply(lookingForMatch)
        }
        // here is where we found a match
        // choose a random unmatched user
        const receiverID = Pandemonium.choice(Array.from(helper.openUsers))

        // lets perform the match
        makeMatch(senderID, receiverID)
        makeMatch(receiverID, senderID)

        const welcomeMsg = 'We found a match for you! You will now be able to chat for 15 minutes before the conversation closes. Please keep in mind that while your username is hidden from the public, messages are logged and displayed publically in the cubemoji Discord server and usernames are viewable by the bot owner. Additionally if you want to end a chat you can use `!end` and if you want to report a chat (which will close it), use `!report`. Use `!id` to reveal your ID 😉. Enjoy!'
        message.author.send(welcomeMsg)
        sendDM(receiverID, welcomeMsg, true)
        // now resolve the other user and send them a msg
        sendDM(helper.matches[senderID].match, helper.matches[senderID].msg)
        sendRamble(`*${helper.matches[senderID].emote.toString()} & ${helper.matches[receiverID].emote.toString()} have entered the chat.*`)

        // then we setup a timeout to stop the convo after 15 minutes
        const timeout = setTimeout(function () {
          message.channel.send(chatEnded)
          sendDM(receiverID, chatEnded, true)
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
