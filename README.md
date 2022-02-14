# cubemoji
A Discord emoji bot, written in Node JS!.
---
This bot uses TypeScript and Node.JS to perform fun image effects. Type / in chat to get an idea of the commands available. Browse here for source code.

Execution
---------
- `npm run build` to build the JS from TypeScript in the `build/` subdirectory
- `npm start` to run the built JS files
- `npm run test` to run through unit tests
- `npm run dev` to use the [tsc-watch](https://www.npmjs.com/package/tsc-watch) package to rebuild the software in real-time while testing features.
- Docker
  - This bot is intended to be run using Docker. My own docker-compose.yml file is included which is what I use to execute the bot on my Pi.

Backend Storage
---------------
Cubemoji uses [Keyv](https://www.npmjs.com/package/keyv) w/ the [keyv-file](https://github.com/zaaack/keyv-file) adapter for persistent storage. These files are saved to data/ subdirectory which can then be mapped to an external folder in Docker-Compose.

Secrets
-------
The bot depends on the following secrets/auth files to function:

### src/res/secrets.json
```json
{
  "token": "your_discord_bot_token",
  // npr limits app commands to running in your testGuild & testChannel
  // as well as increases logging
  "environment": "prd/npr", 
  // guild that you want commands to react to while in NPR
  "testGuild": "id",
  // channel to limit command functionality in npr
  "testChannel": "id",
  // an emoji used to react when there is an error
  // obviously, cubemoji must have access to this emoji
  // by being on the same guild the emoji is located on
  "cubemojiBroken": "<:cubemoji_broken:910351670188339212>",
  // concurrent GM/IM processes to run for image editing tasks
  "workers": 6,
  // version number
  "version": "3.2.0",
  // guild ID of bot owner who gets extra perms
  "botOwner": "id"
}
```
prd mode enables global application commands minus the test guild + test channel you specify  
npr mode limits listening to application commands only in the test guild & test channel you specify  
ids refer to the discord ids of these objects

### src/res/serviceKey.json  
this is used for gcp storage  
https://cloud.google.com/iam/docs/creating-managing-service-account-keys


### .env
Only thing we care about is VERSION