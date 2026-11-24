/**
 * @package @bidproposal/workbench
 * @layer Infrastructure
 * @category Build
 * @author AI-Generated
 * @date 2026-11-25
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

for (const entry of readdirSync(new URL('./src/', import.meta.url))) {
  if (!entry.endsWith('.mjs')) continue;
  const check = spawnSync(
    process.execPath,
    ['--check', fileURLToPath(new URL('./src/' + entry, import.meta.url))],
    { stdio: 'inherit' },
  );
  if (check.status !== 0) process.exit(check.status || 1);
}
