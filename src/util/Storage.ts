import Keyv from 'keyv'
import KeyvFile from 'keyv-file'
import { resolve } from 'path'
import { singleton } from 'tsyringe'
import pkg from '../../package.json'

// database storage using https://github.com/zaaack/keyv-file
@singleton()
export class CubeStorage {
  trashReacts: Keyv<string>
  private location = 'data/'

  constructor () {
    // persist data for each for two weeks
    this.trashReacts = new Keyv<string>({
      store: new KeyvFile({
        filename: resolve(this.location, 'trashReacts.json'),
        writeDelay: 100
      }),
      ttl: 1.21e+9
    })
    this.trashReacts.set('cubemoji_version', pkg.version)
  }
}
