import { Discord } from 'discordx';
import { readdir, unlink } from 'fs/promises';
import Fuse from 'fuse.js';
import { container, injectable } from 'tsyringe';
import { CubeLogger } from '../observability/CubeLogger.js';

export interface TempFile {
  // url as saved in discord cdn
  // or on the web, or the unique ID
  id: string,
  // local filename
  localPath: string,
}

@Discord()
@injectable()
export class FileQueue {
  private fuseOpts = {
    keys: ['id'],
    minMatchCharLength: 3,
    threshold: 0.0,
    fieldNormWeight: 1
  };

  private readonly files: TempFile[];

  private fuse: Fuse<TempFile>;

  private logger = container.resolve(CubeLogger).imageQueue;
  /**
  * Used to keep track of files saved on disk
  * basically we just add another image to the queue
  * and when we hit 40 images, we delete the last one so that we aren't
  * filling the disk.
  * Also used as a caching layer so that we're not consistently downloading
  * the same files over and over again.
  * Queue is stored in reverse in memory.
  * IE front of queue is end of array, end of queue is the front of
  * the array.
  */
  constructor() {
    this.files = [];
    this.fuse = new Fuse(this.files, this.fuseOpts);
  }

  /**
   * enqueue a new image and delete
   * an old one if there are more than
   * 40 images being stored right now
   * @param file new image to push in
   */
  async enqueue(file: TempFile) {
    if (this.files.length >= 40) {
      // delete first item
      const first = this.files.shift();
      if (first) {
        await unlink(first.localPath);
        this.fuse.remove((doc) => {
          return doc === first;
        });
      }
    }
    this.files.push(file);
    this.fuse.add(file);
  }

  /**
   * returns the first item matching the url
   * if there is an image matching the search
   * or undefined if no image can be found
   * which should lead the caller to download the image and enqueue
   * later on themselves
   * @param url - url from discord or the web we're looking
   * to see is downloaded locally
   */
  async search(url: string) {
    const res = this.fuse.search(url);
    if (res.length > 0 && res[0].item.id === url) {
      // promote this item to the end of the queue
      // so it stays around for longer and doesnt get deleted
      const i = res[0].refIndex;
      this.files.splice(i, 1);
      this.files.push(res[0].item);
      // return the first item
      return res[0].item;
    } else { return undefined; }
  }

  // clear downloads folder
  async clear() {
    try {
      await readdir('download/').then(
        async (dir) => {
          dir.map(async file => await unlink(`download/${file}`));
        }
      );
    } catch (err) {
      this.logger.error(err);
    }
  }
}
