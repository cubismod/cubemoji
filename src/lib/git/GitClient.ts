import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import { container, singleton } from 'tsyringe';
import { Milliseconds } from '../constants/Units';
import { CubeLogger } from '../logger/CubeLogger';

@singleton()
export class GitClient {
  readonly directory = 'data/git';
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
      await this.git.clone(this.remoteUrl);
    } catch (err) {
      this.logger.error(err);
    }
  }

  async pull() {
    try {
      await this.git.pull();
    } catch (err) {
      this.logger.error(err);
    }
  }
}
