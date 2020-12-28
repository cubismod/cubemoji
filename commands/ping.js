module.exports = {
    name: 'ping',
    description: 'Test bot ping',
    execute(message, args) {
        message.reply(`pong`);
    }
}