// Generate HTML from PUG template for use in static server
import { GuildManager } from 'discord.js'
import { writeFile } from 'fs/promises'
import { compileFile, compileTemplate } from 'pug'
import { container, singleton } from 'tsyringe'
import { adjectives, names, uniqueNamesGenerator } from 'unique-names-generator'
import { CubeStorage } from '../db/Storage.js'
import { EmoteCache } from '../emote/EmoteCache.js'
import { CubeLogger } from '../logger/CubeLogger.js'

@singleton()
export class PugGenerator {
  private storage = container.resolve(CubeStorage)
  emoteCache = container.resolve(EmoteCache)
  template: compileTemplate
  private logger = container.resolve(CubeLogger).web
  constructor () {
    const source = './assets/template/EmojiList.pug'
    this.template = compileFile(source, {
      cache: true,
      filename: source
    })
  }

  async render (guilds: GuildManager) {
    const db = container.resolve(CubeStorage).serverAnonNames
    await guilds.fetch()
    const servers = new Map<string, string>()      
    for (const guild of guilds.cache) {
      const val = await db.get(guild[0])
      if (val) {
        servers.set(guild[0], val)
      } else {
        const name = uniqueNamesGenerator({dictionaries: [adjectives, names], length: 2, style: 'capital', separator: ' '})
        await db.set(guild[0], name)
        servers.set(guild[0], name)
      }
    }

    await writeFile('./static/list/emoji.html', this.template({
      emotes: this.emoteCache.discEmojis,
      servers: servers
     
    })).catch(err => this.logger.error(err))
  }
}
