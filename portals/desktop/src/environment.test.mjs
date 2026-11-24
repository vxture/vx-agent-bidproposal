/**
 * @package @bidproposal/desktop
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from './environment.mjs';

test('desktop environment authenticates parent messages and recovers initial stage without injecting browser storage', () => {
  const sent = [],
    listeners = new Set();
  const host = { postMessage: (data, origin) => sent.push({ data, origin }) };
  const events = {
    addEventListener: (_, callback) => listeners.add(callback),
    removeEventListener: (_, callback) => listeners.delete(callback),
  };
  const origin = 'http://127.0.0.1:7420';
  const runtime = createRuntime({
    href: 'http://local.invalid/?hostOrigin=' + origin,
    host,
    self: {},
    events,
  });
  const dispatch = (section, patch = {}) => {
    for (const listener of listeners)
      listener({
        source: host,
        origin,
        data: { ns: 'ruyin.navigation', kind: 'navigate', section },
        ...patch,
      });
  };
  dispatch('planning');
  dispatch('chapters', { origin: 'https://foreign.invalid' });
  dispatch('export', { source: {} });
  let visible;
  runtime.onStage((section) => {
    visible = section;
  });
  runtime.replayNavigation();
  assert.equal(visible, 'planning');
  runtime.publishNavigation([{ id: 'planning' }]);
  assert.equal(sent[0].origin, origin);
  assert.equal(sent[0].data.ns, 'ruyin.navigation');
  const path = '/downloads/' + 'a'.repeat(64);
  assert.equal(runtime.downloadUrl(path), origin + path);
  assert.throws(() => runtime.downloadUrl('https://foreign.invalid/file'));
  runtime.close();
  assert.equal(listeners.size, 0);
});

test('desktop environment refuses remote, missing and top-level hosts', () => {
  const events = { addEventListener() {}, removeEventListener() {} };
  for (const origin of [
    '',
    'https://127.0.0.1:7420',
    'http://foreign.invalid:7420',
    'http://127.0.0.1:7420@foreign.invalid',
  ]) {
    assert.throws(() =>
      createRuntime({
        href: 'http://local.invalid/?hostOrigin=' + encodeURIComponent(origin),
        host: {},
        self: {},
        events,
      }),
    );
  }
  const same = {};
  assert.throws(() =>
    createRuntime({
      href: 'http://local.invalid/?hostOrigin=http://localhost:7420',
      host: same,
      self: same,
      events,
    }),
  );
});
