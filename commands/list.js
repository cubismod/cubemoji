module.exports = {
    name: 'list',
    description: 'List available emotes',
    cooldown: 30,
    execute(message, args, client) {
        client.emojis.cache.forEach(function(value, key) {
            message.channel.send(`emote ${key}`)
    })
}
}