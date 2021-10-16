// responses to Discord events
// TODO: add emoji
// TODO: remove emoji
// TODO: edit emoji

import { MessageReaction } from 'discord.js'
import { ArgsOf, Discord, On } from 'discordx'
import { container } from 'tsyringe'
import { getMessageImage } from '../CommandHelper'
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
          if (author && reaction.users.cache.has(author) && author !== '792878401589477377') {
            // ensure cubemoji isn't deleting its own messages
            // perform the delete now
            await reaction.message.delete()
            cubeMessageManager.unregisterMessage(reaction.message.id)
          }
          break
        }
        case '📷': {
          // perform an edit
          const source = getMessageImage(await reaction.message.fetch())
          if (reaction instanceof MessageReaction) {
            console.log('edit in process')
            await editDiscord(reaction, '', source)
          }
        }
      }
    }
  }
}
