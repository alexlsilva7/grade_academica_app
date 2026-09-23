import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const testDir = path.resolve(process.cwd(), 'tests');
const files = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.ts'))
  .map(f => path.join('tests', f));

const res = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], {
  stdio: 'inherit'
});

process.exit(res.status ?? 1);
