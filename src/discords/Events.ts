// responses to Discord events

import { GuildEmoji, MessageEmbed, MessageReaction, TextChannel } from 'discord.js'
import { ArgsOf, Discord, On } from 'discordx'
import { choice } from 'pandemonium'
import { container } from 'tsyringe'
import { adjectives, animals, colors, names, uniqueNamesGenerator } from 'unique-names-generator'
import { getMessageImage, grabEmoteCache, isUrl } from '../util/DiscordLogic'
import { CubeMessageManager } from '../util/MessageManager'
import { editDiscord, rescaleDiscord } from '../util/ImageLogic'

// event handling doesn't go through the usual executeInteraction flow in
// Main.ts

@Discord()
export abstract class EventListeners {
  // messageReactionAdd
  // for when we get a rescale, trash, or trash icon
  @On('messageReactionAdd')
  async onMessageReactionAdd (
    [reaction]: ArgsOf<'messageReactionAdd'>
  ) {
    const cubeMessageManager = container.resolve(CubeMessageManager)
    const reactionUsers = await reaction.users.fetch()
    // last person to react is the user who initated this reaction event
    const user = reactionUsers.last()
    if (cubeMessageManager && user) {
      switch (reaction.emoji.toString()) {
        case '🗑️': {
          // delete a message
          // ensure that only the author of that edit can actually delete their own message
          const author = await cubeMessageManager.retrieveUser(reaction.message.id)
          if (author && reaction.users.cache.has(author) && author !== '792878401589477377') {
            // ensure cubemoji isn't deleting its own messages
            // perform the delete now
            await reaction.message.delete()
            await cubeMessageManager.unregisterMessage(reaction.message.id)
          }
          break
        }
        case '📷': {
          // perform an edit
          const source = getMessageImage(await reaction.message.fetch())
          if (reaction instanceof MessageReaction) {
            await editDiscord(reaction, '', source, user)
          }
          break
        }
        case '📏': {
          // perform a rescale
          const source = getMessageImage(await reaction.message.fetch())
          if (reaction instanceof MessageReaction) {
            await rescaleDiscord(reaction, source, user)
          }
          break
        }
        case '🌟': {
          if (reaction.partial) {
            reaction = await reaction.fetch()
          }
          // for saving to best of
          if (reaction.count === 1) {
            const msg = await reaction.message.fetch()
            // author who reacted to the original image
            const reactor = await cubeMessageManager.retrieveUser(msg.id)
            if (msg.guild) {
              const bestOfChannel = await reaction.client.channels.fetch('901600718404862012')
              const imgSrc = getMessageImage(msg)
              // here we do a couple of checks to ensure that we are able to fetch the
              // best of channel, we aren't reacting to something in the best of channel
              // the message actually has an image
              if (bestOfChannel && bestOfChannel instanceof TextChannel &&
                msg.author.id === '792878401589477377' && await isUrl(imgSrc) &&
                msg.channel.id !== '901600718404862012') {
                const bestOfEmbed = new MessageEmbed()
                bestOfEmbed.setImage(imgSrc)
                // generate a unique name for each image
                const creationName = uniqueNamesGenerator({ dictionaries: [adjectives, animals, colors, names], style: 'capital', separator: ' ' })

                if (reactor) {
                  // if this image was rescaled during cubemoji's execution we know who rescaled it so we can do this funny message
                  const pretext = choice(
                    ['This lovely image is courtesy of',
                      'This wonderous creation was made by',
                      'This hellspawn was thought up by',
                      'This miserable excuse for a meme was brought into the world by',
                      'The devil himself created this image as inspiration from',
                      'People often attribute this work of art to',
                      'Cubemoji thought up of this image because of',
                      'One of the great wonders of the world here was created by'])
                  bestOfEmbed.setDescription(`${pretext} <@${msg.client.users.resolveId(reactor)}> in the server \`${msg.guild.name}\``)
                } else {
                  bestOfEmbed.setDescription(`This image was created in the server, ${msg.guild.name}`)
                }
                bestOfEmbed.setTitle(creationName)
                bestOfEmbed.setColor('RANDOM')
                bestOfEmbed.setFooter('You can save an image to best of by reacting 🌟 to a cubemoji image.')
                bestOfEmbed.setURL(msg.url)
                msg.react('🌟')
                const sentMsg = await bestOfChannel.send({ embeds: [bestOfEmbed] })

                // now  we send the message to the user that it's been added to best of
                const respEmbed = new MessageEmbed()
                respEmbed.setTitle('This image has been added to best of in the cubemoji server')
                respEmbed.setDescription('You can also join the cubemoji server at https://discord.gg/Y59XVpx if you have not already! Use 🌟 as a react to add an image to best of.')
                respEmbed.setURL(sentMsg.url)
                respEmbed.setColor('RANDOM')
                msg.reply({ embeds: [respEmbed], allowedMentions: { repliedUser: false } })
              }
            } else {
              msg.react('❌')
            }
          }
        }
      }
    }
  }

  @On('emojiCreate')
  async emojiCreate (emojis: GuildEmoji[]) {
    if (emojis.length > 0) {
      const emoteCache = grabEmoteCache()
      if (emoteCache) emoteCache.addEmote(emojis[0])
    }
  }

  @On('emojiDelete')
  async emojiDelete (emojis: GuildEmoji[]) {
    if (emojis.length > 0) {
      const emoteCache = grabEmoteCache()
      if (emoteCache) emoteCache.removeEmote(emojis[0])
    }
  }

  @On('emojiUpdate')
  async emojiUpdate (emojis: GuildEmoji[]) {
    if (emojis.length > 1) {
      // the event returns an array with the old emoji at pos 0, new emoji at pos 1
      const emoteCache = grabEmoteCache()
      if (emoteCache) emoteCache.editEmote(emojis[0], emojis[1])
    }
  }
}
