import { DIService } from "discordx"
import { container } from "tsyringe"
import { CubeStorage } from "../../lib/db/Storage.js"
import { isUrl } from "../../lib/image/DiscordLogic.js"
import { CubeLogger } from "../../lib/logger/CubeLogger.js"

beforeAll(() => {
  DIService.container = container
  container.register(CubeLogger, {useValue: new CubeLogger()})
  container.register(CubeStorage, {useValue: new CubeStorage()})
})

describe('check URLs', async () => {
  it('valid url', async () => {
    expect(await isUrl('https://storage.googleapis.com/cubemoji.appspot.com/mutant-emotes/alien.png')).toBeTruthy()
  })

})