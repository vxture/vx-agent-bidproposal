/**
 * @package @bidproposal/desktop
 * @layer Infrastructure
 * @category Build
 * @author AI-Generated
 * @date 2026-11-25
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const version = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8')).version;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Exercise the actual published packer and archive, not a simulated builder. */
function build() {
  const child = spawnSync(process.execPath, [join(here, 'build.mjs')], {
    cwd: here,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 120000,
    maxBuffer: 1024 * 1024,
  });
  assert.equal(child.status, 0, child.error?.message || child.stderr || child.stdout);
  const result = JSON.parse(readFileSync(join(here, 'dist/build-result.json'), 'utf8'));
  const bytes = readFileSync(join(here, 'dist', result.file));
  assert.equal(result.id, 'bidproposal');
  assert.equal(result.version, version);
  assert.equal(result.file, `bidproposal-${version}.ruyinpkg`);
  assert.equal(result.signed, false);
  assert.equal(result.sha256, digest(bytes));
  assert.equal(result.uiSha256, digest(readFileSync(join(here, 'dist/package/ui.zip'))));
  assert.ok(result.files.includes('index.html'));
  assert.ok(result.files.includes('bridge.mjs'));
  assert.ok(result.files.every((name) => !name.includes('.test.') && !name.includes('node_modules')));
  return { result, bytes };
}

const first = build();
const second = build();
assert.deepEqual(second.result, first.result);
assert.deepEqual(second.bytes, first.bytes);
console.log(JSON.stringify({
  product: first.result.id,
  version,
  sha256: first.result.sha256,
  uiSha256: first.result.uiSha256,
  reproducible: true,
  signed: false,
}));
