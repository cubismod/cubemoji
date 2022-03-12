import { access } from "fs/promises";
import { suite } from "uvu";
import * as assert from 'uvu/assert';
import { runBackups } from "../../lib/db/DatabaseMgmt";


export function databaseSuites() {
  const backups = suite('Backups')

  backups('backup test', async() => {
    const files = await runBackups()
    assert.is.not(files, undefined)
    // now parse through the results to ensure all the files were created
    if (files) {
      for(const file of files) {
        try {
          await access(file)
        } catch {
          assert.unreachable()
        }
      }
    }
  })

  return backups
}