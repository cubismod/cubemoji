// test various image effects
import gm from 'gm'
import { fromFile } from 'file-type'
import { compressImage, generateEditOptions, performAddFace, performRescale } from './../src/util/ImgEffects'
import faces from './../src/res/faces.json'
import { performEdit } from '../src/util/PerformEdit'

const exampleImg = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/2018-09-14_15_35_49_View_south_along_Atlantic_County_Route_561_Alternate_%28Moss_Mill_Road%29_just_south_of_Atlantic_County_Route_575_%28Pomona_Road%29_along_the_border_of_Galloway_Township_and_Port_Republic_in_Atlantic_County%2C_New_Jersey.jpg/320px-thumbnail.jpg'

// initializes a file
async function initFile (path: string) {
  const file = gm(path)
  const type = await fromFile(path)
  return {
    file: file,
    type: type
  }
}

test('Compress gif with GraphicsMagick', async () => {
  const dat = await initFile('assets/cubeRoll.gif')
  expect(dat.type).toBeDefined()
  if (dat.type) expect(() => compressImage(dat.file, dat.type!)).not.toThrow()
})

test('Compress jpg with GraphicsMagick', async () => {
  const dat = await initFile('assets/mimi.jpg')
  expect(dat.type).toBeDefined()
  if (dat.type) expect(() => compressImage(dat.file, dat.type!)).not.toThrow()
})

test('Compress png with GraphicsMagick', async () => {
  const dat = await initFile('assets/icon.png')
  expect(dat.type).toBeDefined()
  if (dat.type) expect(() => compressImage(dat.file, dat.type!)).not.toThrow()
})

for (let i = 0; i < 10; ++i) {
  test(`Rescale ${i + 1} out of 10`, async () => {
    // rescales a random image from wikipedia
    const path = await performRescale(exampleImg)
    expect(path).toBeDefined()
  })
}

test('Perform add face on an image', async () => {
  faces.forEach(async face => {
    const path = await performAddFace(exampleImg, face)
    expect(path).toBeDefined()
  })
})

for (let i = 0; i < 10; ++i) {
  test(`Random edit ${i + 1} out of 10`, async () => {
  // try generating a few effects lists and then running
  // edits
    const path = await performEdit(exampleImg, generateEditOptions())
    expect(path).toBeDefined()
  })
}
