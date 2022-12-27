import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { container } from 'tsyringe';
import { RolePicker } from '../cmd/ModHelper.js';
import { CubeStorage } from '../db/Storage.js';
import { CubeLogger } from '../observability/CubeLogger.js';

const logger = container.resolve(CubeLogger).git;
const storage = container.resolve(CubeStorage).rolePickers;

// Parses JSON file
export async function rolePickerParse(dataDir: string) {
  const contents = await readdir(dataDir);
  for (const filename of contents) {
    try {
      const file = await readFile(path.resolve(dataDir, filename));
      const roleFile: RolePicker = JSON.parse(file.toString());

      const dbEntry = await storage.get(roleFile.serverID);

      if (dbEntry) {
        await storage.set(roleFile.serverID, [dbEntry[0], roleFile]);
      } else {
        await storage.set(roleFile.serverID, [true, roleFile]);
      }
    } catch (err) {
      logger.error('Role parsing is broken right now\n', err);
    }
  }
}
