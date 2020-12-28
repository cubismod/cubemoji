module.exports = {
    name: 'pingpong',
    description: 'A good sport!',
    usage: '[pingpong]',
    aliases: ['pp'],
    execute(message, args) {
        message.reply(`🏓`);
    }
}