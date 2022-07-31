import { Discord } from 'discordx';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import { container, injectable } from 'tsyringe';
import { Milliseconds } from '../constants/Units';
import { CubeLogger } from '../observability/CubeLogger';
import { rolePickerParse } from './Parser';

@Discord()
@injectable()
export class GitClient {
  directory = '';
  private remoteUrl;
  private logger = container.resolve(CubeLogger).git;

  options: Partial<SimpleGitOptions>;

  git: SimpleGit;

  constructor() {
    this.remoteUrl = process.env.CM_REMOTE ?? 'https://gitlab.com/cubismod/cubemoji-roles.git';
    this.options = {
      baseDir: this.directory,
      binary: 'git',
      maxConcurrentProcesses: 4,
      timeout: {
        block: Milliseconds.min
      }
    };
    this.git = simpleGit(this.options);
  }

  async init() {
    this.directory = await mkdtemp(path.join(tmpdir(), 'git'));
    try {
      await this.git.clone(this.remoteUrl, this.directory, {

      });
      await this.parse();
    } catch (err) {
      this.logger.error(err);
    }
    this.options.baseDir = this.directory;
    this.git = simpleGit(this.options);
    await this.pull();
  }

  async pull() {
    try {
      this.logger.debug(this.git);
      const preSHA = await this.git.revparse('HEAD');
      await this.git.fetch();
      await this.git.pull('origin');
      const postSHA = await this.git.revparse('HEAD');

      if (preSHA !== postSHA) {
        // process and save to DB
        this.logger.info(`Loaded new changes from ${this.git.remote}. SHA hash: ${postSHA}`);
        await this.parse();
        return `New change loaded for Role Picker config, SHA hash: ${preSHA}➡️${postSHA}.`;
      }
      return `No update to Role Picker config, SHA hash: ${postSHA}`;
    } catch (err) {
      this.logger.error('Failed pulling Git changes\n' + err);
    }
  }

  async parse() { await rolePickerParse(path.join(this.directory, 'data')); }
}
