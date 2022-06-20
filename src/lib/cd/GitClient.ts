import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import { container, singleton } from 'tsyringe';
import { Milliseconds } from '../constants/Units';
import { CubeLogger } from '../logger/CubeLogger';
import { rolePickerParse } from './Parser';

@singleton()
export class GitClient {
  readonly directory = './data/git/';
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

  async clone() {
    try {
      if (!await this.git.checkIsRepo()) { await this.git.clone(this.remoteUrl); } else { this.pull(); }
      await rolePickerParse();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async pull() {
    try {
      const preSHA = await this.git.revparse('HEAD');
      await this.git.fetch();
      await this.git.pull('origin');
      const postSHA = await this.git.revparse('HEAD');

      if (preSHA !== postSHA) {
        // process and save to DB
        this.logger.info(`Loaded new changes from ${this.git.remote}. SHA hash: ${postSHA}`);
        await rolePickerParse();
        return `New change loaded for Role Picker config, SHA hash: ${preSHA}➡️${postSHA}.`;
      }
      return `No update to Role Picker config, SHA hash: ${postSHA}`;
    } catch (err) {
      this.logger.error('Failed pulling Git changes\n' + err);
    }
  }

  async parse() { await rolePickerParse(); }
}
