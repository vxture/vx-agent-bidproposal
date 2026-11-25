import test from 'node:test';
import assert from 'node:assert/strict';
import { createLibraryRequest } from './library-request.mjs';
import { BridgeClient } from './bridge.mjs';

const id = 'debd79b8-e8b8-48f4-826d-3f92cfa41d29';

test('native collection uses the existing scoped bridge for list, import and immutable source versions', async () => {
  const calls = [], listeners = new Set(), origin = 'http://127.0.0.1:7420';
  const host = { postMessage(message, target) {
    calls.push({ message, target });
    queueMicrotask(() => {
      for (const listener of listeners) listener({ source: host, origin, data: {
        ns: 'ruyin.bridge', kind: 'response', id: message.id, ok: true,
        status: 200, body: { path: message.path, input: message.body },
      } });
    });
  } };
  const bridge = new BridgeClient(origin, host, {
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
  });
  try {
    const request = createLibraryRequest(bridge);
    assert.equal((await request()).path, '/items');
    const input = { name: 'technical.docx', category: 'template_technical', base64: 'AA==',
      id, expectedVersion: 1 };
    assert.deepEqual((await request('', { method: 'POST', body: JSON.stringify(input) })).input, input);
    assert.equal((await request('/' + id + '/versions/1/units/0')).path,
      '/items/' + id + '/versions/1/units/0');
    await request('/' + id + '/versions/1/retry', { method: 'POST' });
    assert.ok(calls.every(call => call.target === origin));
    assert.ok(calls.every(call => call.message.ns === 'ruyin.bridge'));
  } finally { bridge.close(); }
  assert.equal(listeners.size, 0);
});

test('library adapter refuses unrelated paths and methods before delivering any host message', async () => {
  let sent = 0;
  const request = createLibraryRequest({ request: () => { sent++; } });
  for (const path of ['https://remote.invalid', '//items', '/../projects', '/projects/x',
    '/' + id + '?workspace=other', '/' + id + '/versions/1/units/-1'])
    await assert.rejects(request(path), /Invalid library request/);
  for (const method of ['PATCH', 'PUT', 'DELETE'])
    await assert.rejects(request('', { method }), /Invalid library request/);
  await assert.rejects(request('/' + id, { method: 'POST' }), /Invalid library request/);
  await assert.rejects(request('/' + id + '/versions/1/retry'), /Invalid library request/);
  await assert.rejects(request('', { method: 'POST', body: 'null' }), /Invalid library body/);
  await assert.rejects(request('', { method: 'POST', body: '[]' }), /Invalid library body/);
  assert.equal(sent, 0);
});

test('native library errors preserve host conflicts and never treat rejection as a saved version', async () => {
  const request = createLibraryRequest({ request: async () => ({ ok: false, status: 409,
    error: { message: 'Resource version changed; reload' } }) });
  await assert.rejects(request('', { method: 'POST', body: '{}' }), /Resource version changed; reload/);
});

test('changing a source view aborts its delivery without leaking the outstanding host promise', async () => {
  let resolve, sent = 0;
  const request = createLibraryRequest({ request: () => { sent++;
    return new Promise(complete => { resolve = complete; });
  } });
  const before = new AbortController();
  before.abort();
  await assert.rejects(request('', { signal: before.signal }), { name: 'AbortError' });
  assert.equal(sent, 0);
  const after = new AbortController();
  const pending = request('/' + id + '/versions/1/units/0', { signal: after.signal });
  after.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  resolve({ ok: true, body: { text: 'Old version' } });
  await Promise.resolve();
});
