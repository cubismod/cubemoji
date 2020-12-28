module.exports = {
    name: 'pong',
    description: 'Test bot pong',
    usage: '[pong]',
    aliases: ['po'],
    execute(message, args) {
        message.reply(`ping`);
    }
}