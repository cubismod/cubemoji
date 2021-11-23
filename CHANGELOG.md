# 3.1.5 - Nov 22 2021
**Bug Fixes**
- Removal of several context menu commands that were untested and causing failures.
- Reduced in server logging for failed rescale/edit commands to cut down on spam.

# 3.1.4 - Nov 17 2021
**New Features**
- Image compression introduced for rescale, edit, addface to speed up operations.
- Improvements to backend logging.
  
**Bug Fixes**
- Fix to `/random` issue https://gitlab.com/cubismod/cubemoji/-/issues/6
- Fix to uncaught `got` exceptions https://gitlab.com/cubismod/cubemoji/-/issues/7

# 3.1.3 - Nov 5 2021
**New Features**
- `/Help` added for a useful guide on how to use cubemoji
- improvements to global guild commands which should hopefully eliminate duplicate commands appearing in chat

# 3.1.1 - Nov 2 2021
**New Features**
- `/List` had been updated to include mutant emotes and additional functionality
  
**Bug Fixes**
- Bug fixes for multiple commands

# 3.1.0 - Oct 31 2021
**New Features**
- Autocomplete is a new Discord Slash command feature and it has been integrated into almost all cubemoji commands. Now, when you are typing, you'll get a list of emojis related to your search so you have an actual idea of what to use now!
- Additional emojis have been added from the Mutant emoji pack https://mutant.tech/
- Discord Timestamps are now used in the `/info` command

# 3.0.1 - Oct 23 2021
**New Features**
- Best of! React to a cubemoji generated image with 🌟 and it will be saved to best-of in cubemoji Discord server
- Status messages added for help with what reacts are available
  
**Bug Fixes**
- Proper exception handling added so the bot should no longer crash as often
- Trash icons for deleting rescaled/edited images have been fixed so that they track the correct id
- All ping replies have been removed
- Minor other performance tweaks

# 3.0.0 - Oct 17 2021
**New Features**
- Total rewrite in Typescript and slash commands
- Removal of basic `c!` commands

# 2.16.14 - May 23 2021
v. 2.16.14 has been released and includes some updates to leaderboard command `c!lb`
additionally, duplicate emotes are handled correctly now by appending numbers to the end of them like uwu, uwu1, uwu2 for example

# 2.16.0 - Apr 11 2021
and another bigger update for tonight v 2.16.0
the leaderboard for slots now updates every 72 hours (3 days)!
updates are done automatically and results are posted in #deleted-channel, get to playing

# 2.15.3 - Apr 11 2021
minor cubemoji update: v. 2.15.3
image edit effects have been fine tuned for better results, try it with `c!edit`

# Apr 4 2021
you can now react 📷  to "edit" an image
📏  to rescale an image
and the bot supports inline replies now

# Apr 1 2021
new cubemoji version with additional edit features  
here are all the edit options:
```json
["blur","charcoal","cycle","edge-detect","emboss","enhance","equalize","flip","flop","implode","magnify","median","minify","monochrome","mosaic","motionBlur","noise","normalize","paint","roll","rotate","sepia","shave","sharpen","solarize","spread","swirl","threshold","trim","wave"]
```

# 2.12.0 - Mar 12 2021
features tmoji

# 2.11.0 - Feb 15 2021
image re-scaling added! this feature is well known as content aware scaling in photoshop 
to use it, just type `c!rs <emote>`
also it works with attachments now too

# 2.10.0 - Feb 8 2021
random messaging feature introduced!
dm @cubemoji `c!msg <insert pickup line here>`
to be matched in an anonymous dm with another user

# 2.9.0 - Feb 3 2021
features additional faces with the add_face command

# 2.8.0 - Jan 31 2021
includes a number of improvements, most notably that twemoji are now supported in `c!ed` & `c!af`

# 2.7.0 - Jan 20 2021
releasing now featuring the new "time on top" feature that tries to calculate how long a user stays on top (may be inaccurate js)
some updates to the leaderboard and steal as well

# 2.6.0 - Jan 17 2021
stealing impemented!

# 2.5.0 - Jan 11 2021
includes avatar support in c!edit and c!add_flush
just mention a user to create an edited avatar for each command!

# 2.4.0 - Jan 10 2021
introduces a number of back-end speed improvements
`c!slots` now has a global leaderboard accessible with `c!leaderboard` or `c!lb`
enjoy! and ping me if you find bugs (which you probably will)

# 2.3.0 - Jan 6 2021
editing has been implemented!

# 2.2.0 - Jan 3 2021
slots implemented!

# 2.1.1 - Jan 3 2021
features `c!add_flush` to turn any emote into a flushed emote!

# 2.0.4 - Jan 1 2021
features `c!cube` to create random emote cubes!

