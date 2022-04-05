import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { getUrl, isUrl } from '../../lib/image/DiscordLogic'

export function discSuites () {
  const discSuite = suite('DiscordLogic')

  const alien = 'https://storage.googleapis.com/cubemoji.appspot.com/mutant-emotes/alien.png'

  discSuite('valid url', async () => {
    assert.is(await isUrl(alien), true)
  })

  // check that getUrl does return the correct and same URL since it shouldn't be blocked
  discSuite('get same url', async () => {
    assert.is(await getUrl(alien, '000'), alien)
  })

  discSuite('jpg extension valid url', async () => {
    assert.is(await isUrl('https://upload.wikimedia.org/wikipedia/commons/2/25/An%C3%A9mona_de_mar_com%C3%BAn_%28Anemonia_viridis%29%2C_Parque_natural_de_la_Arr%C3%A1bida%2C_Portugal%2C_2020-07-21%2C_DD_07.jpg'), true)
  })

  discSuite('gif extension valid url', async () => {
    assert.is(await isUrl('https://upload.wikimedia.org/wikipedia/commons/5/55/8-cell-simple.gif'), true)
  })

  const svg = 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Scalable_Vector_Graphics_Polyline.svg'

  // cubemoji doesn't support svg input
  discSuite('.svg invalid url', async () => {
    assert.is(await isUrl(svg), false)
  })

  discSuite('cannot get .svg url', async () => {
    assert.is(await getUrl(svg, '000'), undefined)
  })

  const blockedUrl = 'https://example.com/img.jpg'
  discSuite('blocked url', async () => {
    assert.is(await isUrl(blockedUrl), false)
  })

  discSuite('http protocol blocked url', async () => {
    assert.is(await isUrl(blockedUrl), false)
  })

  discSuite('cannot get blocked url', async () => {
    assert.is(await getUrl(blockedUrl, '000'), undefined)
  })

  return discSuite
}
