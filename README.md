# cubemoji
A Discord emoji bot, written in Node JS!.
---
This bot uses TypeScript and Node.JS to perform fun image effects. Type / in chat to get an idea of the commands available. Browse here for source code.

Secrets
-------
The bot depends on the following secrets/auth files to function:

### secrets.json
```json
{
  "token": "your_discord_bot_token",
  "environment": "prd/npr",
  "testGuild": "id",
  "testChannel": "id"
}
```
prd mode enables global application commands minus the test guild + test channel you specify  
npr mode limits listening to application commands only in the test guild & test channel you specify  
ids refer to the discord ids of these objects

### serviceKey.json  
this is used for gcp storage  
https://cloud.google.com/iam/docs/creating-managing-service-account-keys


### .env
```sh
WEBHOOK=https://discordapp.com/api/webhooks/{yourwebhookinfohere}/?wait=true
```
Used in the run-watch.sh script which follows the log output and then sends to a Discord webhook for real time logging in Discord.