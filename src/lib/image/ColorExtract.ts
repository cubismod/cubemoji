import Splashy from 'splashy'
import { container } from 'tsyringe'
import { CubeLogger } from '../logger/CubeLogger'
import { isUrl } from './DiscordLogic'

const { got } = await import('got')

/**
 * attempts to parse an image to get the key colors
 * in an image
 * @param url image url
 * @returns string of color hex codes or undefined if url was blocked
 * or some sort of http error
 */
export async function getColors(url: string) {
  const logger = container.resolve(CubeLogger).imageLogic

  if (await isUrl(url)) {
    const resp = await got(url, {
      responseType: 'buffer',
      retry: {
        limit: 2
      },
      timeout: {
        request: 30000
      }
    }).catch(err => {
      logger.error(err)
    })
  
    if (resp) {
      const palette = await Splashy(resp.body)
      return palette
    }
  }
}