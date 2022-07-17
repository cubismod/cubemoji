// Generate HTML from PUG template for use in static server
import { GuildManager } from 'discord.js';
import { stat, writeFile } from 'fs/promises';
import path from 'path';
import { compileFile, compileTemplate } from 'pug';
import { container, singleton } from 'tsyringe';
import { adjectives, names, uniqueNamesGenerator } from 'unique-names-generator';
import { generateList } from '../conversion/UnitList.js';
import { CubeStorage } from '../db/Storage.js';
import { EmoteCache } from '../emote/EmoteCache.js';
import { CubeLogger } from '../observability/CubeLogger.js';

@singleton()
export class PugGenerator {
  templateDir = './assets/template';
  // private storage = container.resolve(CubeStorage);
  emoteCache = container.resolve(EmoteCache);
  emojiListTemplate: compileTemplate;

  private rolePickerPath = path.resolve(this.templateDir, 'RolePicker.pug');

  rolePickerTemplate = compileFile(this.rolePickerPath, {
    filename: this.rolePickerPath,
    cache: true
  });

  private fiveHundredPath = path.resolve(this.templateDir, '500.pug');

  fiveHundredError = compileFile(this.fiveHundredPath, {
    filename: this.fiveHundredPath,
    cache: true
  });

  private roleResultPath = path.resolve(this.templateDir, 'RoleResult.pug');

  roleResult = compileFile(this.roleResultPath, {
    filename: this.roleResultPath,
    cache: true
  });

  private logger = container.resolve(CubeLogger).web;
  constructor() {
    const source = path.resolve(this.templateDir, 'EmojiList.pug');
    this.emojiListTemplate = compileFile(source, {
      filename: source,
      cache: true
    });
  }

  private async simpleRender(pugFile: string, outputName: string) {
    const template = compileFile(pugFile);
    await writeFile(`./static/${outputName}`, template());
  }

  /**
   * Render out content that will be static for the
   * lifetime of the bot, like the homepage, and just
   * call this function once to generate the resulting
   * html files
   */
  async staticRenders() {
    const units = await generateList();

    const unitSrc = path.resolve(this.templateDir, 'UnitList.pug');

    const unitTemp = compileFile(unitSrc, {
      filename: unitSrc
    });

    await writeFile('./static/list/unit.html', unitTemp({
      units
    }));

    await this.simpleRender(path.resolve(this.templateDir, 'Home.pug'), 'home.html');
    await this.simpleRender(path.resolve(this.templateDir, '404.pug'), '404.html');
    await this.simpleRender(path.resolve(this.templateDir, 'Privacy.pug'), 'privacy.html');
  }

  async emojiRender(guilds: GuildManager) {
    const db = container.resolve(CubeStorage).serverAnonNames;
    try {
      await guilds.fetch();
    } catch (err) {
      this.logger.info(`Discord is Stinky Error!: ${err}`);
    }
    const servers = new Map<string, string>();
    for (const guild of guilds.cache) {
      const val = await db.get(guild[0]);
      if (val) {
        servers.set(guild[0], val);
      } else {
        const name = uniqueNamesGenerator({ dictionaries: [adjectives, names], length: 2, style: 'capital', separator: ' ' });
        await db.set(guild[0], name);
        servers.set(guild[0], name);
      }
    }

    await writeFile(path.resolve('./static/list/emoji.html'), this.emojiListTemplate({
      emotes: this.emoteCache.discEmojis,
      servers

    })).catch(err => this.logger.error(err));
  }

  async saveCache(body: string, id: string) {
    try {
      const pathName = `download/${id}.html`;
      await writeFile(pathName, body);

      return pathName;
    } catch (err) {
      this.logger.error(err);
    }
  }

  async retrieveCache (id: string) {
    try {
      const pathName = path.resolve('download', `${id}.html.gz`);
      const exists = await stat(pathName);
      if (exists) return pathName;
    } catch (err) {
      this.logger.error(err);
    }
  }
}
