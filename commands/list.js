module.exports = {
    name: 'list',
    description: 'List available emotes, defaults to printing out all the emotes in well, emote',
    usage: '[list] (optional)[both|text]',
    requiresCache: true,
    cooldown: 30,
    execute(message, args, client, cache) {
        var msgs = [];
        var msgIndex = 0;
        const helper = require('./../helper');
        var emoteArray = cache.createEmoteArray().sort();
        msgs.push('')
        for(emote of emoteArray) {
            // don't overload discord msg limit of 2000 chars
            newText = msgs[msgIndex].concat(`${emote}`);
            newLen = msgs[msgIndex].length + newText.length;
            if(newLen > 2000) {
                // queue up another msg
                msgIndex += 1;
                msgs.push('')
            }
            else {
                msgs[msgIndex] = newText;
            }
        }
        for(msg of msgs) {
            // don't try and send an empty message to discord
            if(msg != '') {
                message.channel.send(msg);
            }
        }
    }
}