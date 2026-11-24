/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from '../../../app/workbench/environment.mjs';

const project = '00000000-0000-4000-a000-000000000777';
const href = 'https://bidproposal.example/workbench/index.html?project=' + project;

test('Web adapter uses own-origin project requests, cookie identity and unchanged revision errors', async () => {
  const calls = [], published = [];
  const runtime = createRuntime({ href, publish: items => published.push(items), fetcher: async (...args) => {
    calls.push(args);
    return { ok: false, status: 409, json: async () => ({ error: { message: 'Revision conflict' } }) };
  } });
  let stage;
  runtime.onStage(section => { stage = section; });
  runtime.replayNavigation();
  assert.equal(stage, 'analysis');
  runtime.navigate('chapters');
  assert.equal(stage, 'chapters');
  runtime.publishNavigation([{ id: 'chapters' }]);
  assert.equal(published.length, 1);
  const reply = await runtime.request('PUT', '/documents/bid_draft', { markdown: 'Retain my draft', revision: 7 });
  assert.deepEqual(reply, { ok: false, status: 409, error: { message: 'Revision conflict' } });
  assert.equal(calls[0][0], 'https://bidproposal.example/api/workbench/projects/' + project + '/documents/bid_draft');
  assert.equal(calls[0][1].credentials, 'same-origin');
  assert.equal(calls[0][1].redirect, 'error');
  assert.deepEqual(JSON.parse(calls[0][1].body), { markdown: 'Retain my draft', revision: 7 });
  for (const path of ['//foreign.invalid/data', '/../../secret', '/documents/%2e%2e', '/documents/x?workspace=other', '/documents//x']) await assert.rejects(runtime.request('GET', path));
  assert.equal(calls.length, 1);
  runtime.close();
  assert.equal(calls[0][1].signal.aborted, true);
});

test('Web downloads accept only issued same-origin tickets and do not fall back when unavailable', async () => {
  const path = '/downloads/' + 'a'.repeat(64);
  const runtime = createRuntime({ href, fetcher: async () => ({ ok: true, status: 200, json: async () => ({ path, filename: 'bid.pdf' }) }) });
  assert.throws(() => runtime.downloadUrl(path));
  await runtime.request('POST', '/renders/render_1/downloads/pdf');
  assert.equal(runtime.downloadUrl(path), 'https://bidproposal.example' + path);
  assert.throws(() => runtime.downloadUrl('https://foreign.invalid/file'));
  runtime.close();
  assert.throws(() => runtime.downloadUrl(path));
  assert.throws(() => createRuntime({ href: 'https://bidproposal.example/workbench/' }));
  const failed = createRuntime({ href, fetcher: async () => { throw Error('Network unavailable'); } });
  await assert.rejects(failed.request('PUT', '/documents/bid_draft', { markdown: 'keep', revision: 2 }), /Network unavailable/);
  failed.close();
});
