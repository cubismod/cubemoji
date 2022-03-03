// Generate HTML from PUG template for use in static server
import { writeFile } from 'fs/promises'
import { compileFile, compileTemplate } from 'pug'
import { container, singleton } from 'tsyringe'
import { EmoteCache } from '../emote/EmoteCache'
import { CubeLogger } from '../logger/CubeLogger'

@singleton()
export class PugGenerator {
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

  async render () {
    await writeFile('./static/pug/emoji.html', this.template({
      emotes: this.emoteCache.discEmojis
    })).catch(err => this.logger.error(err))
  }
}
