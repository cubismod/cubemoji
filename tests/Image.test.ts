// test various image effects
import gm from 'gm'
import { fromFile } from 'file-type'
import { compressImage, generateEditOptions, performAddFace, performRescale } from './../src/util/ImgEffects'
import faces from './../src/res/faces.json'
import { performEdit } from '../src/util/PerformEdit'
import { choice } from 'pandemonium'

// initializes a file
async function initFile (path: string) {
  const file = gm(path)
  const type = await fromFile(path)
  return {
    file: file,
    type: type
  }
}

// return a random image
function randomImage () {
  return choice(
    [
      'https://upload.wikimedia.org/wikipedia/commons/a/a6/Animated_phenakistiscope_disc_-_Running_rats_Fantascope_by_Thomas_Mann_Baynes_1833.gif',
      'https://upload.wikimedia.org/wikipedia/commons/5/55/8-cell-simple.gif',
      'https://upload.wikimedia.org/wikipedia/commons/2/21/Spinning_Dancer.gif',
      'https://upload.wikimedia.org/wikipedia/commons/8/81/Platonic_Solids_Stereo_2_-_Cube.gif',
      'https://upload.wikimedia.org/wikipedia/commons/4/44/Viscosities.gif',
      'https://upload.wikimedia.org/wikipedia/commons/1/17/Lyapunov-fractal.png',
      'https://upload.wikimedia.org/wikipedia/commons/6/6d/Theba_planata_zonata_01.JPG',
      'https://upload.wikimedia.org/wikipedia/commons/e/e5/D%C3%BClmen%2C_Merfeld%2C_Volvo_PV_544_B18_--_2021_--_0075-9.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/a/ac/D%C3%BClmen%2C_Dernekamp%2C_Strohballen_--_2015_--_7838.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/e/e1/L%C3%BCdinghausen%2C_Flugplatz_Borkenberge%2C_PKW_auf_dem_Parkplatz_--_2014_--_0079.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/b/ba/D%C3%BClmen%2C_Kirchspiel%2C_BMW_Mini_--_2016_--_5065-71.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/b/b9/M%C3%BCnster%2C_LBS%2C_Funktionsskulptur_--_2021_--_9801.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/b/be/D%C3%BClmen%2C_Kirchspiel%2C_Oedlerteich_--_2016_--_1949.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/f/f9/Tripedalia-cystophora.png',
      'https://upload.wikimedia.org/wikipedia/commons/2/2b/Big.Buck.Bunny.-.Frank.Rinky.Gimera.png',
      'https://upload.wikimedia.org/wikipedia/commons/b/b4/ETA-ESA_955.412%2C_contents_1.png',
      'https://upload.wikimedia.org/wikipedia/commons/5/57/St_georges_church_carrington_greater_manchester.png'
    ]
  )
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

for (let i = 0; i < 20; ++i) {
  test(`Rescale ${i + 1} out of 20`, async () => {
    // rescales a random image from wikipedia
    const path = await performRescale(randomImage())
    expect(path).toBeDefined()
  })
}

test('Perform add face on an image', async () => {
  faces.forEach(async face => {
    const path = await performAddFace(randomImage(), face)
    expect(path).toBeDefined()
  })
})

for (let i = 0; i < 10; ++i) {
  test(`Random edit ${i + 1} out of 10`, async () => {
  // try generating a few effects lists and then running
  // edits
    const path = await performEdit(randomImage(), generateEditOptions())
    expect(path).toBeDefined()
  })
}
