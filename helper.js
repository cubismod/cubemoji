// helper functions
var moment = require('moment'); // require
// a class which can return an array version of emotes
// and also only refreshes when necessary
module.exports = class EmoteCache {
    constructor(emoteCache) {
        this.emoteCache = emoteCache;
        this.arrayVersion = []; //init with an empty array
        // we only want to do an update every ten minutes
        this.nextUpdateTime = moment().add(15, 'minutes');
    }
    createEmoteArray(emoteCache) {
        // we are just manually iterating through the map to create a list
        // ensure we only update if there is no data or the update time has lapsed
        if((this.arrayVersion == undefined || this.arrayVersion == 0)
        || (moment().isAfter(this.nextUpdateTime))) {
            this.emoteCache = emoteCache;
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
}