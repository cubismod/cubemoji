import { suite } from "uvu"
import * as assert from 'uvu/assert'
import { isUrl } from "../../lib/image/DiscordLogic"


export const discSuite = suite('DiscordLogic')

discSuite('valid url', async() => {
  assert.is(await isUrl('https://storage.googleapis.com/cubemoji.appspot.com/mutant-emotes/alien.png'), true)
})

discSuite('jpg extension valid url', async() => {
  assert.is(await isUrl('https://upload.wikimedia.org/wikipedia/commons/2/25/An%C3%A9mona_de_mar_com%C3%BAn_%28Anemonia_viridis%29%2C_Parque_natural_de_la_Arr%C3%A1bida%2C_Portugal%2C_2020-07-21%2C_DD_07.jpg'), true)
})

discSuite('gif extension valid url', async() => {
  assert.is(await isUrl('https://upload.wikimedia.org/wikipedia/commons/5/55/8-cell-simple.gif'), true)
})

discSuite('.svg invalid url', async() => {
  assert.is(await isUrl('https://upload.wikimedia.org/wikipedia/commons/c/cd/Scalable_Vector_Graphics_Polyline.svg'), false)
})

discSuite('blocked url', async() => {
  assert.is(await isUrl('https://example.com/img.jpg'), false)
})

discSuite('http protocol blocked url', async() => {
  assert.is(await isUrl('http://example.com/img.jpg'), false)
})