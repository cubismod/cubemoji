import { ApplicationCommandPermissions } from 'discord.js'
import { container } from 'tsyringe'
import { CubeStorage } from '../lib/db/Storage'

/**
 * List or server owners
 */
async function OwnerCheck () {
  const storage = container.resolve(CubeStorage)
  const owners = storage.getNamespace('owners')
  if (owners && owners.length > 0) {
    return owners.map(owner => {
      return { id: owner.key.replace('owners:', ''), permission: true, type: 'USER' }
    })
  }
}

/**
 * list of moderator roles as well as owners
 */
async function ModCheck () {
  const storage = container.resolve(CubeStorage)
  const mods = storage.getNamespace('mods')
  if (mods && mods.length > 0) {
    // remove the prefix of namespace + guildId to just get the role id
    return mods.map(mod => {
      return { id: mod.key.replace(/mods:.+-/, ''), permission: true, type: 'ROLE' }
    })
  }
}

export async function ModOwnerCheck (): Promise<ApplicationCommandPermissions[]> {
  const owners = await OwnerCheck()
  const mods = await ModCheck()
  let results:ApplicationCommandPermissions[] = []
  if (owners) results = results.concat(owners as ApplicationCommandPermissions[])
  if (mods) results = results.concat(mods as ApplicationCommandPermissions[])
  if (results.length > 0) return results
  return [{ id: '944722244452630548', permission: true, type: 'USER' }]
}
