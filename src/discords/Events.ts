// responses to Discord events
// TODO: add emoji
// TODO: remove emoji
// TODO: edit emoji

import { MessageReaction } from 'discord.js'
import { ArgsOf, Discord, On } from 'discordx'
import { container } from 'tsyringe'
import { CubeMessageManager } from '../Cubemoji'
import { editDiscord } from '../ImgEffects'

@Discord()
export abstract class EventListeners {
  // messageReactionAdd
  // for when we get a rescale, trash, or trash icon
  @On('messageReactionAdd')
  async onMessageReactionAdd (
    [reaction]: ArgsOf<'messageReactionAdd'>
  ) {
    const cubeMessageManager = container.resolve(CubeMessageManager)
    if (cubeMessageManager) {
      switch (reaction.emoji.toString()) {
        case '🗑️': {
          // delete a message
          // ensure that only the author of that edit can actually delete their own message
          const author = cubeMessageManager.retrieveUser(reaction.message.id)
          if (author && reaction.users.cache.has(author)) {
            // perform the delete now
            await reaction.message.delete()
            cubeMessageManager.unregisterMessage(reaction.message.id)
          }
          break
        }
        case '📷': {
          // perform an edit
          // TODO: figure out why self reacts aren't working
          if (reaction instanceof MessageReaction) {
            console.log('edit in process')
            await editDiscord(reaction, '', reaction.message.content)
          }
        }
      }
    }
  }
}
