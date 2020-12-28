module.exports = {
    name: 'about',
    description: 'Information about the bot!',
    execute(message) {
        message.channel.send('Here is my git! https://gitlab.com/cubismod/cubemoji');
    }
}