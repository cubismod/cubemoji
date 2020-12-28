module.exports = {
    name: 'emote',
    description: 'Inserts an emote',
    requiresCache: false,
    execute(message, args, client) {
        if(args.length < 1) {
            message.reply('You must specify an emote name in the command!')
        }
        else {
            // emoji names are only one word long so we will only consider the 0th element
            // also doing case insensitive searching
            emoteName = args[0].toLowerCase();
            res = client.emojis.cache.find(emote => emote.name.toLowerCase() == emoteName);
            if(res) {
                message.channel.send(res.toString());
            }
            else {
                message.reply('emote not found!')
            }
        }
        
    }
}