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
const href =
  'https://bidproposal.example/workbench/index.html?project=' + project;

test('Web adapter uses own-origin project requests, cookie identity and unchanged revision errors', async () => {
  const calls = [],
    published = [];
  const runtime = createRuntime({
    href,
    publish: (items) => published.push(items),
    fetcher: async (...args) => {
      calls.push(args);
      return {
        ok: false,
        status: 409,
        json: async () => ({ error: { message: 'Revision conflict' } }),
      };
    },
  });
  let stage;
  runtime.onStage((section) => {
    stage = section;
  });
  runtime.replayNavigation();
  assert.equal(stage, 'analysis');
  runtime.navigate('chapters');
  assert.equal(stage, 'chapters');
  runtime.publishNavigation([{ id: 'chapters' }]);
  assert.equal(published.length, 1);
  const reply = await runtime.request('PUT', '/documents/bid_draft', {
    markdown: 'Retain my draft',
    revision: 7,
  });
  assert.deepEqual(reply, {
    ok: false,
    status: 409,
    error: { message: 'Revision conflict' },
  });
  assert.equal(
    calls[0][0],
    'https://bidproposal.example/api/workbench/projects/' +
      project +
      '/documents/bid_draft',
  );
  assert.equal(calls[0][1].credentials, 'same-origin');
  assert.equal(calls[0][1].redirect, 'error');
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    markdown: 'Retain my draft',
    revision: 7,
  });
  for (const path of [
    '//foreign.invalid/data',
    '/../../secret',
    '/documents/%2e%2e',
    '/documents/x?workspace=other',
    '/documents//x',
  ])
    await assert.rejects(runtime.request('GET', path));
  assert.equal(calls.length, 1);
  runtime.close();
  assert.equal(calls[0][1].signal.aborted, true);
});

test('Web downloads accept only issued same-origin tickets and do not fall back when unavailable', async () => {
  const path = '/downloads/' + 'a'.repeat(64);
  const runtime = createRuntime({
    href,
    publish: () => {},
    fetcher: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ path, filename: 'bid.pdf' }),
    }),
  });
  assert.throws(() => runtime.downloadUrl(path));
  await runtime.request('POST', '/renders/render_1/downloads/pdf');
  assert.equal(runtime.downloadUrl(path), 'https://bidproposal.example' + path);
  assert.throws(() => runtime.downloadUrl('https://foreign.invalid/file'));
  runtime.close();
  assert.throws(() => runtime.downloadUrl(path));
  assert.throws(() =>
    createRuntime({ href: 'https://bidproposal.example/workbench/' }),
  );
  const failed = createRuntime({
    href,
    publish: () => {},
    fetcher: async () => {
      throw new Error('Network unavailable');
    },
  });
  await assert.rejects(
    failed.request('PUT', '/documents/bid_draft', {
      markdown: 'keep',
      revision: 2,
    }),
    /Network unavailable/,
  );
  failed.close();
});

test('Web transport requires explicit presentation and preserves full workflow metadata', () => {
  assert.throws(
    () => createRuntime({ href }),
    /Workflow presentation is not attached/,
  );
  let received;
  const runtime = createRuntime({
    href,
    publish: (items) => {
      received = items;
    },
  });
  const items = [
    {
      id: 'analysis',
      label: 'Analyze',
      state: 'complete',
      startedAt: '2026-11-20T01:45:00Z',
      completedAt: '2026-11-20T01:57:00Z',
    },
  ];
  runtime.publishNavigation(items);
  assert.deepEqual(received, items);
  runtime.close();
});

test('production download tickets keep the shared short-path contract and map to the issued API URL', async () => {
  for (const format of ['pdf', 'docx', 'md']) {
    const token = 'b'.repeat(64);
    const issuedPath = '/api/workbench/downloads/' + token;
    const runtime = createRuntime({
      href,
      publish: () => {},
      fetcher: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          path: issuedPath,
          filename: 'bid.' + format,
          sha256: 'digest',
          size: 42,
        }),
      }),
    });
    const reply = await runtime.request(
      'POST',
      '/renders/render_1/downloads/' + format,
    );
    assert.equal(reply.body.path, '/downloads/' + token);
    assert.match(reply.body.path, /^\/downloads\/[a-f0-9]{64}$/);
    assert.equal(reply.body.filename, 'bid.' + format);
    assert.equal(reply.body.sha256, 'digest');
    assert.equal(
      runtime.downloadUrl(reply.body.path),
      'https://bidproposal.example' + issuedPath,
    );
    assert.throws(() => runtime.downloadUrl(issuedPath), /Unissued download/);
    runtime.close();
    assert.throws(
      () => runtime.downloadUrl(reply.body.path),
      /Unissued download/,
    );
  }
});

test('unrelated, failed and malformed ticket responses cannot authorize downloads', async () => {
  const short = '/downloads/' + 'c'.repeat(64);
  for (const [ok, requestPath, issuedPath] of [
    [false, '/renders/render_1/downloads/pdf', short],
    [true, '/project', short],
    [
      true,
      '/renders/render_1/downloads/pdf',
      'https://foreign.invalid' + short,
    ],
    [
      true,
      '/renders/render_1/downloads/pdf',
      '/api/workbench/../downloads/' + 'c'.repeat(64),
    ],
    [
      true,
      '/renders/render_1/downloads/pdf',
      '/api/workbench' + short + '?workspace=other',
    ],
  ]) {
    const runtime = createRuntime({
      href,
      publish: () => {},
      fetcher: async () => ({
        ok,
        status: ok ? 200 : 403,
        json: async () => ({ path: issuedPath }),
      }),
    });
    await runtime.request('POST', requestPath);
    assert.throws(() => runtime.downloadUrl(short), /Unissued download/);
    assert.throws(() => runtime.downloadUrl(issuedPath), /Unissued download/);
    runtime.close();
  }
});
