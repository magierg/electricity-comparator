import { readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evalsDir = resolve(dirname(fileURLToPath(import.meta.url)));
const casesDir = join(evalsDir, 'cases');
const suiteIndex = process.argv.indexOf('--suite');
const suite = suiteIndex === -1 ? null : process.argv[suiteIndex + 1];

const cases = readdirSync(casesDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => {
    const casePath = join(casesDir, file);
    const spec = JSON.parse(readFileSync(casePath, 'utf8'));
    return {
      name: spec.name ?? basename(file, '.json'),
      suite: spec.suite ?? 'full',
    };
  })
  .filter((entry) => suite === null || entry.suite === suite)
  .map((entry) => entry.name)
  .sort();

if (cases.length === 0) {
  console.error(`No eval cases found${suite ? ` for suite "${suite}"` : ''}`);
  process.exit(1);
}

console.log(JSON.stringify(cases));
