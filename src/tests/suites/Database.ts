import { randomUUID } from 'crypto'
import { access } from 'fs/promises'
import { container } from 'tsyringe'
import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { runBackups } from '../../lib/db/DatabaseMgmt'
import { CubeStorage } from '../../lib/db/Storage'

export function databaseSuites () {
  const backups = suite('Backups')
  const storage = suite('Database Storage')
  const cubeStorage = container.resolve(CubeStorage)

  storage.before(async () => {
    // set values in each db so they are at least created
    await cubeStorage.blockedChannels.set(randomUUID(), {
      channelName: randomUUID(),
      guildId: randomUUID(),
      guildName: randomUUID()
    })
    await cubeStorage.emojiBlocked.set(randomUUID(), randomUUID())
    await cubeStorage.modEnrollment.set(randomUUID(), randomUUID())
    await cubeStorage.serverAuditInfo.set(randomUUID(), randomUUID())
    await cubeStorage.serverEnrollment.set(randomUUID(), randomUUID())
    await cubeStorage.trashReacts.set(randomUUID(), randomUUID())
  })

  backups('backup test', async () => {
    const files = await runBackups()
    assert.is.not(files, undefined)
    // now parse through the results to ensure all the files were created
    if (files) {
      for (const file of files) {
        try {
          await access(file)
        } catch {
          assert.unreachable()
        }
      }
    }
  })

  return [storage, backups]
}
