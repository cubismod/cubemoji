/**
 * Using Fly.io as our deployment platform introduces some challenges when it comes to databases.
 * We use SQLite storage in a Fly.io volume which we then have to backup ourselves
 * Our backup strategy is 14 days of snapshots zipped up in data/backups subdir
 *
 * Backups are run nightly around 2:00AM EST
 */

import Database from 'better-sqlite3'
import dayjs from 'dayjs'
import { createReadStream, createWriteStream } from 'fs'
import { mkdir, readdir, stat, unlink } from 'fs/promises'
import { pipeline } from 'stream'
import { container } from 'tsyringe'
import { promisify } from 'util'
import { createGzip } from 'zlib'
import { Milliseconds } from '../constants/Units.js'
import { CubeLogger } from '../logger/CubeLogger.js'


/**
 * runs SQL database backups using dump and then performs backup rotations
 * @param firstRun if toggled yes, then will set an interval to perform backups every 24
 * hours
 * @returns list of backup files (relative to root node dir) or undefined on error
 */
export async function runBackups (firstRun = true) {
  const logger = container.resolve(CubeLogger).databaseMgmt
  logger.info('Running database backups')
  await mkdir('data/backups', { recursive: true })
  const paths: string[] = []
  let success = true
  
  const dataLocation = process.env.CM_TEST ? '/data/test' : 'data/'

  const contents = await readdir(dataLocation)
  
  for (const filename of contents) {
    if (filename.endsWith('.sqlite')) {
      // found SQLite to backup
      try {
        const db = new Database(dataLocation + filename, { readonly: true, fileMustExist: true })
        // if source filename is serverInfo.sqlite, backup name would be like
        // serverInfo-2021-02-15-14_48_00.sqlite
        const backupName = `data/backups/${filename.replace('.sqlite', '')}-${dayjs().format('YYYY-MM-DD-HH_mm_ss')}.sqlite`
        // backup throws err if failed
        await db.backup(backupName)
        db.close()
        // assuming backup succeeded, we compress
        await compress(backupName)
        paths.push(backupName + '.gz')
      } catch (err) {
        success = false
        logger.error(`Backup of ${filename} failed!`)
        logger.error(err)
      }
    }
  }
  if (firstRun) {
    // setup an interval to run every 24 hours
    setInterval(runBackups, Milliseconds.day, false)
  }

  if (success) {
    // let's remove old backup files
    const contents = await readdir('data/backups')
    for (const filename of contents) {
      try {
        const statInfo = await stat('data/backups/' + filename)
        if (dayjs(statInfo.ctime) < dayjs().subtract(1, 'week')) {
          // file older than a week
          await unlink('data/backups/' + filename)
          logger.info(`Deleted backup SQL file: ${filename}`)
        }
      } catch (err) {
        logger.error(`Backup cleanup of ${filename} failed!`)
        logger.error(err)
      }
    }
    return paths
  } return undefined
}

async function compress (sourcePath: string) {
  // https://nodejs.org/api/zlib.html
  const gzip = createGzip()
  const source = createReadStream(sourcePath)
  const dest = createWriteStream(sourcePath + '.gz')
  const pipe = promisify(pipeline)

  await pipe(source, gzip, dest)

  // delete og file upon compression
  await unlink(sourcePath)
}

export function scheduleBackup () {
  const logger = container.resolve(CubeLogger).databaseMgmt
  const cur = dayjs()
  // run backup immedieatly if backup between these times
  if (cur.hour() > 0 && cur.hour() < 5) {
    runBackups()
  } else {
    // schedule backup for tomorrow
    const backupTime = cur.add(1, 'day').set('hour', 2).set('minute', 0)
    logger.info(`Backup scheduled for ${backupTime.toString()}`)
    const offset = backupTime.diff(cur)
    setTimeout(runBackups, offset)
  }
}
