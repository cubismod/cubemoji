import Keyv from 'keyv'
import KeyvFile from 'keyv-file'
import { resolve } from 'path'
import { singleton } from 'tsyringe'

export interface ImageJob {
  // rescale or edit
  type: string,
  // a url
  source: string,
  // who invoked the job originally
  // by reacting or triggering the
  // job in another manner
  owner: string,
  effects?: string,
}

// database storage using https://github.com/zaaack/keyv-file
@singleton()
export class CubeStorage {
  trashReacts: Keyv<string>
  imageJobs: Keyv<ImageJob>
  private location = 'data/'

  constructor () {
    /*
    Database that is persisting the info for little trash icons you see
    under images edited by cubemoji
    - key: message snowflake ID from Discord
    - value: author snowflake ID
    Author is the user who reacted to the image not whoever
    posted the image
    */
    this.trashReacts = new Keyv<string>({
      store: new KeyvFile({
        filename: resolve(this.location, 'trashReacts.json'),
        writeDelay: 100
      }),
      // 1 week in ms
      ttl: 6.048e+8
    })

    /*
    Stores information about how to recreate a job.
    We pertist
    - key: message snowflake ID
    - value: see ImageJob interface
    */
    this.imageJobs = new Keyv<ImageJob>({
      store: new KeyvFile({
        filename: resolve(this.location, 'imageJobs.json'),
        writeDelay: 100
      }),
      // 8 hours in ms
      ttl: 2.88e+7
    })
  }
}
