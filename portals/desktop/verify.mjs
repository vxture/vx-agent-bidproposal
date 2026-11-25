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
import { applicationAssets } from '@bidproposal/workbench/assets';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const version = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8')).version;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** The public packer writes stored entries; inspect the actual output archive. */
function storedEntries(bytes) {
  const entries = new Map();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(bytes.readUInt16LE(offset + 8), 0);
    const size = bytes.readUInt32LE(offset + 18);
    const nameSize = bytes.readUInt16LE(offset + 26);
    const extraSize = bytes.readUInt16LE(offset + 28);
    const name = bytes.subarray(offset + 30, offset + 30 + nameSize).toString();
    const start = offset + 30 + nameSize + extraSize;
    entries.set(name, bytes.subarray(start, start + size));
    offset = start + size;
  }
  assert.equal(bytes.readUInt32LE(offset), 0x02014b50);
  return entries;
}

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
  for (const name of ['library.mjs', 'library.css', 'library-request.mjs'])
    assert.ok(result.files.includes(name), 'Missing native resource asset: ' + name);
  const contract = readFileSync(join(here, 'dist/package/ruyin.product.yaml'), 'utf8');
  assert.match(contract, /sha256: [a-f0-9]{64}/);
  const entries = storedEntries(readFileSync(join(here, 'dist/package/ui.zip')));
  for (const asset of applicationAssets()) {
    if (asset.name !== 'library.html')
      assert.deepEqual(entries.get(asset.name), asset.data, 'Changed original business asset: ' + asset.name);
  }
  assert.match(entries.get('library.html').toString(), /src="library\.mjs"/);
  const library = entries.get('library.mjs').toString();
  assert.doesNotMatch(library, /\/api\/workbench|next\/|https:\/\/jadera\.ruyin\.work/);
  const parsed = ts.createSourceFile('library.mjs', library, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const imports = parsed.statements.filter(ts.isImportDeclaration)
    .map(statement => statement.moduleSpecifier.text);
  assert.deepEqual(imports.sort(), ['./environment.mjs', './library-request.mjs']);
  assert.match(entries.get('library.css').toString(), /\.jadera-resource-card/);
  assert.doesNotMatch(entries.get('library.css').toString(), /@import\s/);
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
