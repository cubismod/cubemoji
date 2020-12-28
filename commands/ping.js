module.exports = {
    name: 'ping',
    description: 'Test bot ping',
    execute(message, args) {
        message.channel.send(`Bot ping is ${Date.now() - message.createdTimestamp}ms`);
    }
}