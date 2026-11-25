import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** No remote assets or product credentials are needed to assemble this surface. */
export async function libraryAssets() {
  const result = await build({
    absWorkingDir: here,
    entryPoints: ['src/library.tsx'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    external: ['./environment.mjs', './library-request.mjs'],
    define: { 'process.env.NODE_ENV': '"production"' },
    jsx: 'automatic',
    outfile: 'library.mjs',
    write: false,
    minify: true,
    legalComments: 'eof',
    logLevel: 'silent',
  });
  const from = join(here, 'src/library.css');
  const css = await postcss([tailwind({ base: here, optimize: true })]).process(
    readFileSync(from, 'utf8'), { from, map: false },
  );
  if (/@import\s|url\(\s*["']?https?:/i.test(css.css))
    throw new Error('Native styles must be fully local and compiled');
  return [
    { name: 'library.mjs', data: result.outputFiles[0].contents },
    { name: 'library.css', data: Buffer.from(css.css) },
    { name: 'library-request.mjs', data: Buffer.from(readFileSync(join(here, 'src/library-request.mjs'), 'utf8').replaceAll('\r\n', '\n')) },
    { name: 'library.html', data: Buffer.from('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jadera</title><link rel="stylesheet" href="library.css"></head><body><div id="library-root"></div><script type="module" src="library.mjs"></script></body></html>') },
  ];
}
