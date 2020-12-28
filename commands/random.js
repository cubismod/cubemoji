module.exports = {
    name: 'random',
    description: 'Insert a random emote!',
    requiresCache: true,
    execute(message, args, client, cache) {
        // first we get a random number
        var emoteArray = cache.createEmoteArray();
        var randomNumber = Math.floor(Math.random() * emoteArray.length);
        message.channel.send(emoteArray[randomNumber].toString());
    }
}