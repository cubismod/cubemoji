// image logic typa tests
import { watch } from "chokidar"
import { choice } from "pandemonium"
import { container } from "tsyringe"
import { suite } from "uvu"
import * as assert from 'uvu/assert'
import { downloadImage, EditOperation, FaceOperation, generateEditOptions, RescaleOperation } from "../../lib/image/ImageLogic"
import { WorkerPool } from "../../lib/image/WorkerPool"
import faces from '../../res/faces.json'
import effects from '../../res/imgEffects.json'

export function imgSuites() {
  // a number of different image files to try
  const urls = [
    'https://upload.wikimedia.org/wikipedia/commons/a/a0/English_liberty-_being_a_collection_of_interesting_tracts%2C_from_the_year_1762_to_1769_Fleuron_T074071-20.png',
    'https://upload.wikimedia.org/wikipedia/commons/2/25/An%C3%A9mona_de_mar_com%C3%BAn_%28Anemonia_viridis%29%2C_Parque_natural_de_la_Arr%C3%A1bida%2C_Portugal%2C_2020-07-21%2C_DD_07.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/a/a9/Les_Iffs_%2835%29_%C3%89glise_Ext%C3%A9rieur_40.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/55/On_the_fringe_of_the_former_Deopham_Airfield_-_geograph.org.uk_-_704231.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/d/d5/ISS043-E-295573_-_View_of_Earth.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/9/9e/Helsinki_-_Panoramic_view_from_the_Helsinki_Cathedral_on_Senate_Square_-_Panoraaman%C3%A4kym%C3%A4_Helsingin_Tuomiokirkon_Senaatintorin_-_panoramio.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/1/1a/The_Friary%2C_Lancaster_city_centre_-_geograph.org.uk_-_1755265.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/1/10/-i---i-_%2827011071733%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/6/6b/Lockman%2C_Abraham_-_State-_New_York_-_Regiment-_Richmond_County_Battalion_%28Conner%27s%29%2C_New_York_Militia_-_DPLA_-_0e90b925e3608cfaf4277e0906028801.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/4/4d/2019-03-03_Bogenhausener_Tor_Muenchen-25.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/0/04/Dan_Hadani_collection_%28990048233530205171%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/7/7e/Pezhman_alizadeh_chef.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/4/44/Klify_2_-_panoramio_-_7alaskan.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/d/d0/Color_coded_racetrack_large_channel.gif',
    'https://upload.wikimedia.org/wikipedia/commons/2/21/Spinning_Dancer.gif',
    'https://upload.wikimedia.org/wikipedia/commons/5/54/Frontal_lobe_animation.gif',
    'https://upload.wikimedia.org/wikipedia/commons/4/47/2004_Indonesia_Tsunami_Complete.gif',
    'https://upload.wikimedia.org/wikipedia/commons/2/28/Radiometer_9965_Nevit.gif',
    'https://upload.wikimedia.org/wikipedia/commons/0/05/Muybridge_race_horse_animated_184px.gif',
    'https://upload.wikimedia.org/wikipedia/commons/3/38/Crew_after_sinking_of_SMS_Seeadler.gif',
    'https://upload.wikimedia.org/wikipedia/commons/e/e8/Newtons_cradle_animation_book.gif',
    'https://upload.wikimedia.org/wikipedia/commons/6/62/Cicada_molting_animated-2.gif'
  ]

  const rescaleSuite = suite('Rescale')
  const editSuite = suite('Edit')
  const addFaceSuite = suite('AddFace')
  const downloadSuite = suite('Download Image')
  
  const workerPool = container.resolve(WorkerPool)
  
  for (let i = 0; i < 4; i++) {
    const img = choice(urls)
    rescaleSuite(`rescaling ${img}`, async() => {
      const rescale = new RescaleOperation(img)
      const file = await rescale.run()
      assert.is.not(file, '')
      watch(file, {awaitWriteFinish: true}).on('add', async() =>
        workerPool.done(file)
      )
    })
  
    editSuite(`editing ${img}`, async() => {
      const edit = new EditOperation(img, generateEditOptions())
      const file = await edit.run()
      assert.is.not(file, '')
      watch(file, {awaitWriteFinish: true}).on('add', async() =>
        workerPool.done(file)
      )
    })

    const face = choice(faces)
    addFaceSuite(`adding face ${face} to ${img}`, async() => {
      const addFace = new FaceOperation(img, face)
      const file = await addFace.run()
      assert.is.not(file, '')
      watch(file, {awaitWriteFinish: true}).on('add', async() =>
        workerPool.done(file)
      )
    })
    
    downloadSuite(`downloading ${img} to disk`, async() => {
      assert.is.not(await downloadImage(img), undefined)
    })
  }

  editSuite('generate edit options', () => {
    const opts = generateEditOptions()
    opts.forEach(opt => {
      const includes = effects.includes(opt)
      assert.ok(includes)
    })
  })

  return [rescaleSuite, editSuite, addFaceSuite, downloadSuite]
}