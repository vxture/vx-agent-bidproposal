/**
 * @package @bidproposal/app
 * @layer Infrastructure
 * @category DocumentLayoutTests
 * @author AI-Generated
 * @date 2026-11-25
 */
import { writeFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { parseDocument, renderDocx } from '@vxture/ruyin-document';

const target = process.argv[2];
if (!target || !isAbsolute(target))
  throw new Error('An absolute fixture path is required');
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
