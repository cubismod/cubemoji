import { container } from "tsyringe"
import { suite } from "uvu"
import { ImageQueue } from "../../lib/image/ImageQueue"

export function ImgQueueSuite() {
  const queueSuite = suite('Image Queue testing')
  const imageQueue = container.resolve(ImageQueue)
}