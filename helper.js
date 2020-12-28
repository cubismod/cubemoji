// helper functions
var moment = require('moment');
var search = require('js-search')
// a class which can return an array version of emotes
// and also only refreshes when necessary
module.exports = class EmoteCache {
    constructor(client) {
        this.client = client;
        this.emoteCache = client.emojis.cache;
        this.arrayVersion = []; //init with an empty array
        // we only want to do an update every ten minutes
        this.nextUpdateTime = moment().add(15, 'minutes');
    }
    createEmoteArray() {
        // we are just manually iterating through the map to create a list
        // ensure we only update if there is no data or the update time has lapsed
        if((this.arrayVersion == undefined || this.arrayVersion == 0)
        || (moment().isAfter(this.nextUpdateTime))) {
            this.emoteCache = this.client.emojis.cache;
            var emotes = [];
            for(let [_, value] of this.emoteCache) {
                emotes.push(value);
            }
            this.arrayVersion = emotes;
            // only perform an update every fifteen minutes
            this.nextUpdateTime = moment().add(15, 'minutes');
        }
        return this.arrayVersion;
    }
    search(query) {
        // init indexing
        var searcher = new search.Search('name');
        searcher.indexStrategy = new search.AllSubstringsIndexStrategy();
        searcher.addIndex('name');
        // search among emote names
        // first make sure the emote array is up to date
        searcher.addDocuments(this.createEmoteArray());
        return(searcher.search(query));
    }
}