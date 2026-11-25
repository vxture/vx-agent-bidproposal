/**
 * @package @bidproposal/desktop
 * @layer Infrastructure
 * @category Build
 * @author AI-Generated
 * @date 2026-11-25
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { writeZip, packProduct } from '@vxture/ruyin-cli';
import { collectAssets } from '@bidproposal/workbench/assets';
import { businessContract } from '@bidproposal/workbench/contract';
import { libraryAssets } from './library-build.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const version = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8')).version;
if (process.argv.length > 2) throw new Error('Usage: pnpm --filter @bidproposal/desktop build');
const output = join(here, 'dist');
const readText = (path) => readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
const environment = readText(join(here, 'src/environment.mjs')).replace(
  "'@bidproposal/workbench/runtime'",
  "'./runtime.mjs'",
);
const shared = collectAssets(environment, [
  { name: 'bridge.mjs', data: Buffer.from(readText(join(here, 'src/bridge.mjs'))) },
]);
const assets = [
  ...shared.filter(asset => asset.name !== 'library.html'),
  ...await libraryAssets(),
];
const ui = writeZip(assets);
const digest = createHash('sha256').update(ui).digest('hex');
let contract = businessContract(readText(join(here, '../app/contract/ruyin.product.yaml')));
contract = contract
  .replace('contract: "0.1"', 'contract: "0.2"')
  .replace('  version: 1.0.0', '  version: ' + version)
  .replace('    minimum: 0.1.0', '    minimum: 0.2.0')
  .replace('  publisher: vxture', '  ui:\n    sha256: ' + digest + '\n  publisher: vxture');
const staging = join(output, 'package');
mkdirSync(staging, { recursive: true });
writeFileSync(join(staging, 'ruyin.product.yaml'), contract);
writeFileSync(join(staging, 'ui.zip'), ui);
const packed = packProduct(staging);
writeFileSync(join(output, packed.fileName), packed.buffer);
writeFileSync(
  join(output, 'build-result.json'),
  JSON.stringify(
    {
      id: packed.id,
      version: packed.version,
      file: packed.fileName,
      sha256: packed.sha256,
      uiSha256: digest,
      signed: false,
      files: assets.map((asset) => asset.name),
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    { file: join(output, packed.fileName), sha256: packed.sha256, signed: false },
    null,
    2,
  ),
);
