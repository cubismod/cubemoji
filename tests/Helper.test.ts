import { isUrl } from '../src/util/CommandHelper'

// command helper testing
test('http url not valid', async () => {
  expect(await isUrl('http://www.columbia.edu/~fdc/picture-of-something.jpg')).toBeFalsy()
})

test('fake url not valid', async () => {
  expect(await isUrl('https://cubemoji.gov')).toBeFalsy()
})

test('real url valid', async () => {
  expect(await isUrl('https://gitlab.com/uploads/-/system/project/avatar/23331669/icon.png')).toBeTruthy()
})

test('yaml file ext not valid', async () => {
  expect(await isUrl('https://gitlab.com/cubismod/cubemoji/-/raw/master/docker-compose.yaml')).toBeFalsy()
})

test('svg file ext not valid', async () => {
  expect(await isUrl('https://gitlab.com/cubismod/cubemoji/-/raw/master/assets/cubemoji_broken.svg')).toBeFalsy()
})
