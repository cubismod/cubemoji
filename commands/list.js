module.exports = {
    name: 'list',
    description: 'List available emotes',
    usage: '[list] (optional)[both|text]',
    cooldown: 30,
    execute(message, args, client) {
        var msgs = [];
        var msgIndex = 0;
        const helper = require('./../helper');
        var emoteArray = helper.createEmoteArray(client);
        emoteArray = emoteArray.sort()
        msgs.push('')
        for(emote of emoteArray) {
            // don't overload discord msg limit of 2000 chars
            if(args[0] == "both") {
                // show both emotes and text
                newText = msgs[msgIndex].concat(`${emote} - ${emote.name}, `);
            }
            else if(args[0] == "text") {
                // show just the text
                newText = msgs[msgIndex].concat(`${emote.name}, `);
            }
            else {
                // default to just showing the emotes
                newText = msgs[msgIndex].concat(`${emote}`);
            }
            
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