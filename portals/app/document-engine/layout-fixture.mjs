/**
 * @package @bidproposal/app
 * @layer Infrastructure
 * @category DocumentLayoutTests
 * @author AI-Generated
 * @date 2026-11-25
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseDocument, renderDocx } from '@vxture/ruyin-document';

if (process.argv.length > 2) throw new Error('This build fixture accepts no arguments');
const target = join(tmpdir(), 'bid-layout-regression.docx');
const markdown = `Synthetic layout regression

::ry-pagebreak

::ry-toc{depth="3" title="Contents"}

::ry-pagebreak

# First chapter

## First section

This is synthetic software acceptance material.

| Requirement | Response |
|---|---|
| Connections | 256 |

::ry-pagebreak

# Second chapter

## Second section

No customer material or credentials are included.
`;
writeFileSync(
  target,
  await renderDocx(parseDocument(markdown), {
    title: 'Synthetic layout regression',
  }),
);
