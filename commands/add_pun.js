module.exports = {
  name: 'add_pun',
  description: 'add a pun to the database',
  usage: '[add_pun]',
  aliases: ['ap'],
  requiresCache: false,
  execute (message, args) {
    console.log('add_pun command used')
    if (args.length < 1) {
      return message.reply('you need to enter a pun!')
    }
    let pun = args.join(' ')
    // limit the pun sizes
    if (pun.size > 2000) {
      pun = pun.slice(0, 2000)
    }
    const fs = require('fs')
    const secrets = require('../secrets.json')

    fs.readFile(secrets.pun_file, (err, data) => {
      if (err) throw err
      const puns = JSON.parse(data)
      puns.push(pun)
      fs.writeFile(secrets.pun_file, JSON.stringify(puns), (err) => {
        if (err) throw err
      })
    })
    return message.reply('pun successfully saved')
  }
}
