// test various image effects
import gm from 'gm'
import { fromFile } from 'file-type'
import { compressImage } from './../src/util/ImgEffects'

test('Compress gif with GraphicsMagick', async () => {
  const gifPath = 'assets/cubeRoll.gif'
  const gif = gm(gifPath)
  const ft = await fromFile(gifPath)
  expect(ft).toBeDefined()
  if (ft) expect(() => compressImage(gif, ft)).not.toThrow()
})
