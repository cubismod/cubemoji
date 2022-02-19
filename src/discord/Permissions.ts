import { ApplicationCommandPermissions } from 'discord.js'
import { container } from 'tsyringe'
import { CubeStorage } from '../util/Storage'

/**
 * returns an array of user IDs where each user owns
 * a guild that the bot is in
 */
export async function OwnerCheck (): Promise<ApplicationCommandPermissions[]> {
  const storage = container.resolve(CubeStorage)
  const owners = storage.getNamespace('owners')
  if (owners) {
    return owners.map(owner => {
      return { id: owner.key.replace('owners:', ''), permission: true, type: 'USER' }
    })
  } else {
    return [{ id: '', permission: false, type: 'USER' }]
  }
}
