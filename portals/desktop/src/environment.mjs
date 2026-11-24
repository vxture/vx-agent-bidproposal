/**
 * @package @bidproposal/desktop
 * @layer Presentation
 * @category Runtime
 * @author AI-Generated
 * @date 2026-11-25
 */
import { BridgeClient } from './bridge.mjs';
import { StageNavigation } from '@bidproposal/workbench/runtime';

/** Bind the shared application only to the verified loopback RUYIN parent. */
export function createRuntime({ href = location.href, host = window.parent, events = window, self = window } = {}) {
  const origin = new URL(href).searchParams.get('hostOrigin');
  if (!origin || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin) || host === self) {
    throw Error('\u8bf7\u4ece RUYIN \u5de5\u4f5c\u53f0\u6253\u5f00\u6807\u4e66\u4ea7\u54c1\u3002');
  }
  const bridge = new BridgeClient(origin, host, events);
  const navigation = new StageNavigation();
  const receive = event => {
    if (event.source !== host || event.origin !== origin) return;
    if (event.data?.ns === 'ruyin.navigation' && event.data.kind === 'navigate') navigation.select(event.data.section);
  };
  events.addEventListener('message', receive);
  return {
    request: (method, path, body) => bridge.request(method, path, body),
    review: id => bridge.review(id),
    onStage: listener => navigation.subscribe(listener),
    replayNavigation: () => navigation.replay(),
    publishNavigation: items => host.postMessage({ ns: 'ruyin.navigation', kind: 'register', items }, origin),
    downloadUrl(path) {
      if (!/^\/downloads\/[a-f0-9]{64}$/.test(path)) throw Error('Invalid download');
      return new URL(path, origin).href;
    },
    close() {
      events.removeEventListener('message', receive);
      navigation.close();
      bridge.close();
    },
  };
}
