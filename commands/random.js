module.exports = {
    name: 'random',
    description: 'Insert a random emote!',
    requiresCache: true,
    execute(message, args, client, emoteArray) {
        // first we get a random number
        var randomNumber = Math.floor(Math.random() * emoteArray.length);
        message.channel.send(emoteArray[randomNumber].toString());
    }
}