import { unlink } from 'fs'
import { singleton } from 'tsyringe'
import Fuse from 'fuse.js'

export interface Image {
  // url as saved in discord cdn
  // or on the web
  url: string,
  // local filename
  localPath: string,
}

@singleton()
export class ImageQueue {
  private images: Image[]
  /**
  * Used to keep track of images saved on disk
  * basically we just add another image to the queue
  * and when we hit 40 images, we delete the last one so that we aren't
  * filling the disk.
  * Also used as a caching layer so that we're not consistently downloading
  * the same files over and over again.
  * Queue is stored in reverse in memory.
  * IE front of queue is end of array, end of queue is the front of
  * the array.
  */
  constructor () {
    this.images = []
  }

  /**
   * enqueue a new image and delete
   * an old one if there are more than
   * 40 images being stored right now
   * @param image new image to push in
   */
  async enqueue (image: Image) {
    if (this.images.length >= 40) {
      // delete first item
      const first = this.images.shift()
      if (first) {
        await unlink(first.localPath, (err) => {
          if (err) { console.error(err) }
        })
      }
    }
    this.images.push(image)
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
  async search (url: string) {
    const options = {
      keys: ['url'],
      minMatchCharLength: 3
    }
    const search = new Fuse(this.images, options)
    const res = search.search(url)
    if (res.length > 0) {
      // promote this item to the front of the queue
      // so it stays around for longer and doesnt get deleted
      const i = res[0].refIndex
      this.images.splice(i, 1)
      this.images.push(res[0].item)
      // return the first item
      return res[0].item
    } else { return undefined }
  }
}
