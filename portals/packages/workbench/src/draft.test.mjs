/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DraftSession } from './draft.mjs';
function store() {
  let value;
  return {
    request: async (method, path, body) => {
      assert.equal(path, '/documents/bid_draft');
      if (method === 'GET')
        return value ? { ok: true, status: 200, body: value } : { ok: false, status: 404 };
      if ((value?.revision ?? 0) !== body.revision)
        return { ok: false, status: 409, error: { message: 'Conflict' } };
      value = { markdown: body.markdown, revision: body.revision + 1 };
      return { ok: true, status: 200, body: value };
    },
  };
}
test('multi-chapter drafts reopen with independent manual edits and stale writes are rejected', async () => {
  const bridge = store(),
    first = new DraftSession(bridge);
  await first.load();
  assert.equal(first.dirty, false);
  first.add('Chapter one');
  first.chapters[0].body = 'Manual content\n\n## Nested heading';
  first.add('Chapter two');
  first.chapters[1].body = 'Other content';
  await first.save();
  const stale = new DraftSession(bridge);
  await stale.load();
  first.chapters[0].body += '\nManual edit';
  await first.save();
  stale.chapters[1].body = 'Stale edit';
  await assert.rejects(stale.save(), (e) => e.status === 409);
  assert.equal(stale.chapters[1].body, 'Stale edit');
  const reopened = new DraftSession(bridge);
  await reopened.load();
  assert.equal(reopened.chapters[0].body, first.chapters[0].body);
  assert.equal(reopened.chapters[1].body, 'Other content');
  assert.equal(reopened.dirty, false);
});
test('invalid drafts fail without overwriting source', async () => {
  const bridge = store(),
    draft = new DraftSession(bridge);
  await draft.load();
  draft.add('Valid');
  draft.chapters[0].body = '<!-- bidproposal:chapter:reserved -->';
  await assert.rejects(draft.save(), /Reserved/);
  assert.throws(() => DraftSession.decode('unrecognized document'), /Unsupported/);
  draft.chapters[0].body = 'x'.repeat(1024 * 1024 + 1);
  await assert.rejects(draft.save(), /1 MiB/);
});
