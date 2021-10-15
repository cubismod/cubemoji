/* eslint-disable no-unused-vars */
import { Snowflake } from 'discord-api-types'
import { CommandInteraction, GuildEmoji, Message, SnowflakeUtil } from 'discord.js'
import { Discord } from 'discordx'
import { unlink } from 'fs'
import { injectable } from 'tsyringe'

// the emoji can come from a few places
// Discord implies that this carries a GuildEmoji object
// Mutant emojis are from here https://mutant.tech/
// URL is typically for custom emotes not in Cubemoji's client that we can parse
// right from a URL
export enum Source {
  Discord,
  Mutant,
  URL
}

// effects used in an edit operation
export enum Effects {
  Blur,
  Charcoal,
  Cycle,
  Edge,
  Emboss,
  Enhance,
  Equalize,
  Flip,
  Flop,
  Implode,
  Magnify,
  Median,
  Minify,
  Monochrome,
  Mosaic,
  Motionblur,
  Noise,
  Normalize,
  Paint,
  Roll,
  Rotate,
  Sepia,
  Shave,
  Sharpen,
  Solarize,
  Spread,
  Swirl,
  Threshold,
  Trim,
  Wave
}

@Discord()
@injectable()
// used to keep track of images saved on disk
// basically we just add another image to the queue
// and when we hit 20 images, we delete the last one so that we aren't
// filling the disk
export class ImageQueue {
  private images: string[]
  constructor () {
    this.images = []
  }

  async enqueue (image: string) {
    if (this.images.length > 19) {
      // delete first item
      const first = this.images.shift()
      if (first) {
        console.log(`deleting ${first}`)
        await unlink(first, (err) => {
          if (err) console.error(err)
        })
      }
    }
    this.images.push(image)
  }
}

@Discord()
@injectable()
// used to keep track of cubemoji sent messages
export class CubeMessageManager {
  // first option is the message ID, second option is the user ID who sent the message
  private sentMessages: Map<Snowflake, Snowflake>
  constructor () {
    this.sentMessages = new Map()
  }

  registerTrashReact (interaction: CommandInteraction, msg: Message) {
    if (interaction.guild &&
      interaction.guild.me &&
      interaction.channel &&
      interaction.guild.me.permissionsIn(interaction.channelId).has('MANAGE_MESSAGES') &&
      interaction.guild.me.permissionsIn(interaction.channelId).has('ADD_REACTIONS') &&
      interaction.member) {
      // all these checks to ensure cubemoji can delete the message and can also add a react
      msg.react('🗑️')
      this.sentMessages.set(msg.id, interaction.member.user.id)
    }
  }

  // retrieves the user ID in snowflake form or undefined if there is no message associated with that id
  retrieveUser (messageID: Snowflake) {
    return this.sentMessages.get(messageID)
  }

  unregisterMessage (msgID: Snowflake) {
    this.sentMessages.delete(msgID)
  }
}

// an individual emote
export class Cmoji {
    name: string
    url: string
    source: Source
    guildEmoji: GuildEmoji | null // null if our source isn't Discord
    id: Snowflake // unique ID is generated for emojis missing an ID otherwise it should be copied from the Discord OBJ

    constructor (name: string | null, url: string, source: Source, guildEmoji: GuildEmoji | null = null, id: Snowflake = SnowflakeUtil.generate()) {
      // hate this nonsense of a null name, never seen it in the wild
      if (name != null) this.name = name
      else this.name = '??'
      this.url = url
      this.source = source
      this.guildEmoji = guildEmoji
      // auto generate an ID
      this.id = id
    }
}
