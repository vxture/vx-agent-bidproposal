/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-26
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ContinuousPdfViewer } from './pdf-viewer.mjs';

test('scroll pruning frees previously observed distant canvases while preserving the visible page and text selection', () => {
  const previousWindow = globalThis.window;
  const rows = Array.from({ length: 12 }, (_, n) => ({
    ready: n !== 11,
    canvas: { width: 1200, height: 1800 },
    node: { cleared: false, getBoundingClientRect: () => ({ top: n * 1200 }),
      replaceChildren() { this.cleared = true; } },
  }));
  globalThis.window = { getSelection: () => ({ isCollapsed: false, containsNode: (node) => node === rows[0].node }) };
  try {
    ContinuousPdfViewer.prototype.releaseDistant.call({ pages: new Map(rows.map((row, n) => [n, row])) }, 7200);
    assert.equal(rows[0].ready, true, 'selected text must survive scrolling');
    assert.equal(rows[1].canvas.width, 0, 'old page is freed without another observer crossing');
    assert.equal(rows[1].node.cleared, true);
    assert.equal(rows[6].ready, true, 'current reading page stays rendered');
    assert.equal(rows[9].ready, false, 'distant page canvas is released');
    assert.equal(rows[11].node.cleared, false, 'an in-flight page is not cleared under its renderer');
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('fast page jumps discard queued pages which are no longer near the viewport', () => {
  const row = { generation: 1, loading: true,
    node: { getBoundingClientRect: () => ({ top: 20000, bottom: 21000 }) } };
  const viewer = {
    generation: 1, active: 0, queue: [row],
    container: { getBoundingClientRect: () => ({ top: 0, bottom: 800 }) },
    render() { throw new Error('Obsolete page should not render'); },
  };
  ContinuousPdfViewer.prototype.pump.call(viewer);
  assert.equal(viewer.active, 0);
  assert.equal(viewer.queue.length, 0);
  assert.equal(row.loading, false, 'returning to this page must be able to enqueue it again');
});
