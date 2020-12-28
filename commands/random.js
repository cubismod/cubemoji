module.exports = {
    name: 'random',
    description: 'Insert a random emote!',
    execute(message, args, client) {
        const helper = require('./../helper');
        var emoteArray = helper.createEmoteArray(client);
        // first we get a random number
        var randomNumber = Math.floor(Math.random() * emoteArray.length);
        message.channel.send(emoteArray[randomNumber].toString())
        // var index = 0;
        // client.emojis.cache.forEach(function(value, key) {
        //     // then send out our message
        //     if(randomNumber == index) {
        //         message.channel.send(`${client.emojis.cache.get(value)}`)
        //     }
        // })
    }
}