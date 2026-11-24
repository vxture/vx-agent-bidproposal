/**
 * @package @bidproposal/desktop
 * @layer Infrastructure
 * @category Build
 * @author AI-Generated
 * @date 2026-11-25
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { collectAssets } from '@bidproposal/workbench/assets';
import { businessContract } from '@bidproposal/workbench/contract';

const here = dirname(fileURLToPath(import.meta.url));
const version = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8')).version;
const runtimeRoot = process.argv[2];
if (!runtimeRoot) throw Error('Usage: node build.mjs RUYIN_CHECKOUT [OUTPUT]');
const output = resolve(process.argv[3] || join(here, 'dist'));
const { writeZip } = await import(pathToFileURL(resolve(runtimeRoot, 'packages/cli/dist/zip.js')).href);
const { packProduct } = await import(pathToFileURL(resolve(runtimeRoot, 'packages/cli/dist/pack.js')).href);
const readText = path => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const environment = readText(join(here, 'src/environment.mjs')).replace("'@bidproposal/workbench/runtime'", "'./runtime.mjs'");
const assets = collectAssets(environment, [{ name: 'bridge.mjs', data: Buffer.from(readText(join(here, 'src/bridge.mjs'))) }]);
const ui = writeZip(assets);
const digest = createHash('sha256').update(ui).digest('hex');
let contract = businessContract(readText(join(here, '../app/contract/ruyin.product.yaml')));
contract = contract.replace('contract: "0.1"', 'contract: "0.2"')
  .replace('  version: 1.0.0', '  version: ' + version)
  .replace('    minimum: 0.1.0', '    minimum: 0.2.0')
  .replace('  publisher: vxture', '  ui:\n    sha256: ' + digest + '\n  publisher: vxture');
const staging = join(output, 'package');
mkdirSync(staging, { recursive: true });
writeFileSync(join(staging, 'ruyin.product.yaml'), contract);
writeFileSync(join(staging, 'ui.zip'), ui);
const packed = packProduct(staging);
writeFileSync(join(output, packed.fileName), packed.buffer);
writeFileSync(join(output, 'build-result.json'), JSON.stringify({ id: packed.id, version: packed.version, file: packed.fileName, sha256: packed.sha256, uiSha256: digest, signed: false, files: assets.map(asset => asset.name) }, null, 2));
console.log(JSON.stringify({ file: join(output, packed.fileName), sha256: packed.sha256, signed: false }, null, 2));
