/**
 * @package @bidproposal/workbench
 * @layer Infrastructure
 * @category Build
 * @author AI-Generated
 * @date 2026-11-25
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join } from 'node:path';
import { buildSync } from 'esbuild';

const require = createRequire(import.meta.url);
const textAssets = new Set(['.mjs', '.js', '.css', '.html', '.json', '.svg']);
const source = fileURLToPath(new URL('./src/', import.meta.url));
const vendor = [
  ['vendor-marked.mjs', 'marked', 'lib/marked.esm.js'],
  ['marked-LICENSE.txt', 'marked', 'LICENSE'],
  ['vendor-dompurify.mjs', 'dompurify', 'dist/purify.es.mjs'],
  ['dompurify-LICENSE.txt', 'dompurify', 'LICENSE'],
  ['vendor-pdf.mjs', 'pdfjs-dist', 'build/pdf.mjs'],
  ['vendor-pdf-worker.mjs', 'pdfjs-dist', 'build/pdf.worker.mjs'],
  ['pdfjs-LICENSE.txt', 'pdfjs-dist', 'LICENSE'],
];

/** Both deliverables consume these exact normalized application bytes. */
export function applicationAssets() {
  return readdirSync(source)
    .filter((name) => !name.endsWith('.test.mjs'))
    .sort()
    .map((name) => {
      const bytes = readFileSync(join(source, name));
      const data = textAssets.has(extname(name))
        ? Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'))
        : bytes;
      return { name, data };
    });
}

/** Resolve declared packages locally; do not fetch anything during packaging. */
export function vendorAssets() {
  const assets = vendor.map(([name, dependency, path]) => {
    const root = dirname(dirname(require.resolve(dependency)));
    return { name, data: readFileSync(join(root, path)) };
  });
  const editor = buildSync({
    entryPoints: [fileURLToPath(new URL('./editor-entry.mjs', import.meta.url))],
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    write: false,
    minify: true,
    legalComments: 'eof',
  });
  assets.push({ name: 'vendor-editor.mjs', data: Buffer.from(editor.outputFiles[0].contents) });
  return assets;
}

/** Only the environment entry and its transport differ between outputs. */
export function collectAssets(environment, extra = []) {
  const entries = [
    ...applicationAssets(),
    ...vendorAssets(),
    ...extra,
    {
      name: 'environment.mjs',
      data: Buffer.isBuffer(environment) ? environment : Buffer.from(environment),
    },
  ];
  if (new Set(entries.map((entry) => entry.name)).size !== entries.length)
    throw new Error('Duplicate application asset');
  return entries;
}
