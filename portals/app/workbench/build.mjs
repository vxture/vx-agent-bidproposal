/**
 * @package @bidproposal/app
 * @layer Infrastructure
 * @category Build
 * @author AI-Generated
 * @date 2026-11-25
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectAssets } from '@bidproposal/workbench/assets';

const output = fileURLToPath(new URL('./dist/', import.meta.url));
const environment = readFileSync(new URL('./environment.mjs', import.meta.url), 'utf8')
  .replaceAll('\r\n', '\n')
  .replace("'@bidproposal/workbench/runtime'", "'./runtime.mjs'");
mkdirSync(output, { recursive: true });
const assets = collectAssets(environment, [
  { name: 'web.css', data: readFileSync(new URL('./web.css', import.meta.url)) },
]);
for (const { name, data } of assets) {
  const bytes = name.endsWith('.html')
    ? Buffer.from(
        data.toString().replace('</head>', '<link rel="stylesheet" href="web.css"></head>'),
      )
    : data;
  writeFileSync(join(output, name), bytes);
}
