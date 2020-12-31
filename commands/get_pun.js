module.exports = {
  name: 'get_pun',
  description: 'gets a random pun from the database',
  usage: '[get_pun]',
  aliases: ['gp'],
  requiresCache: false,
  execute (message) {
    console.log('get_pun command used')
    const fs = require('fs')
    const secrets = require('../secrets.json')
    const Pandemonium = require('pandemonium')

    fs.readFile(secrets.pun_file, (err, data) => {
      if (err) throw err
      const puns = JSON.parse(data)
      message.channel.send(Pandemonium.choice(puns))
    })
  }
}
