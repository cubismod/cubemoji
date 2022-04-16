import { readFile, writeFile } from 'fs/promises';
import Qty from 'js-quantities';

// generates a list of all available quantity units
export async function generateList() {
  const filename = './data/units.json';
  try {
    const file = await readFile(filename);
    const set: string[] = JSON.parse(file.toString());
    return set;
  } catch {
    // can't access so we need to generate units file
    const units = Qty.getUnits();
    const unitList = new Set<string>();
    for (const unit of units) {
      try {
        const aliases = Qty.getAliases(unit);
        for (const alias of aliases) unitList.add(alias);
      } catch { }
    }

    const arrayedVersion = Array.from(unitList);
    await writeFile(filename, JSON.stringify(arrayedVersion));
    return arrayedVersion;
  }
}
