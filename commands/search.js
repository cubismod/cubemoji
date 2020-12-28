module.exports = {
    name: 'search',
    description: 'Search the database for emotes',
    requiresCache: true,
    execute(message, args, client, cache) {
        results = cache.search(args[0]);
        if(results.length == 0) {
            message.channel.send(`No results found for your search query \`${args[0]}\``);
        }
        else {
            // stagger out messages so we don't overdue the 2,000 char msg limit
            var msgs = [];
            var msgIndex = 0;
            msgs.push(`${results.length} result(s) found for your search query \`${args[0]}\`\n`)
            for(result of results) {
                var newText = msgs[msgIndex].concat(`\`${result.name}\`, `)
                var newLen = msgs[msgIndex].length + newText.length;
                if(newLen > 2000) {
                    msgIndex += 1;
                    msgs.push('');
                }
                else {
                    msgs[msgIndex] = newText
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
}