/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Readings, flagLabel } from './reading.mjs';
test('reading client uses only pinned imported IDs and preserves multiple source versions', async () => {
  const old = { id: 'r1', name: 'tender.pdf', hash: 'a'.repeat(64), state: 'completed' },
    file = { id: 'f2', name: 'tender.pdf', hash: 'b'.repeat(64) };
  let sent;
  const bridge = {
    request: async (method, path, body) => {
      if (path === '/files')
        return { ok: true, body: { items: [file, { id: 'x', name: 'legacy.doc' }] } };
      if (path === '/readings' && method === 'GET') return { ok: true, body: { items: [old] } };
      if (method === 'POST') {
        sent = body;
        return { ok: true, body: { ...body, state: 'queued' } };
      }
      return { ok: false, status: 404, error: { message: 'No saved unit' } };
    },
  };
  const r = new Readings(bridge);
  await r.load();
  assert.equal(r.files.length, 1);
  assert.deepEqual(r.versions(file), [old]);
  await r.start(file);
  assert.deepEqual(Object.keys(sent).sort(), ['fileId', 'hash', 'id']);
  assert.equal(sent.hash, file.hash);
  await assert.rejects(r.start({ ...file, hash: old.hash }), /revision/);
  await assert.rejects(r.unit(old.id, 99), (e) => e.status === 404);
  assert.notEqual(flagLabel('images-not-transcribed'), 'images-not-transcribed');
});
