// helper functions
module.exports = {
    createEmoteArray(client) {
        // we are just manually iterating through the map to create a list
        var emotes = [];
        for(let [_, value] of client.emojis.cache) {
            emotes.push(value);
        }
        return emotes;
    }
}