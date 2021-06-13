require('./../extended-msg')
module.exports = {
  name: 'say',
  description: 'Say something',
  usage: '[say] <channel id> <text>',
  aliases: ['sy'],
  cooldown: 5,
  execute (message, args, client) {
    if (args.length < 2 || message.author.id !== '170358606590377984') {
      message.inlineReply('You must include a channel id and text in the command and be cubis!')
    } else {
      const channel = client.channels.fetch(args[0])
      channel.then(fetched => {
        // get the text and put it back together
        const text = args.slice(1).join(' ')
        fetched.send(text)
        console.log(`"${text}" sent using say command in #${fetched.name} in ${fetched.guild.name}`)
      })
        .catch(reason => {
          console.error(reason)
          message.inlineReply('unable to retrieve the channel')
        })
    }
  }
}
