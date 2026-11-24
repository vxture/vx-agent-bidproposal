/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { StageNavigation } from './runtime.mjs';

test('navigation replays selection after asynchronous panels mount and rejects unknown stages', () => {
  const navigation = new StageNavigation();
  const seen = [];
  navigation.subscribe((stage) => seen.push(stage));
  navigation.select('requirements');
  navigation.select('analysis');
  assert.equal(navigation.select('not-a-stage'), false);
  let visible;
  navigation.subscribe((stage) => {
    visible = stage;
  });
  navigation.replay();
  assert.equal(visible, 'analysis');
  assert.deepEqual(seen, ['requirements', 'analysis', 'analysis']);
  navigation.close();
  navigation.select('chapters');
  assert.equal(visible, 'analysis');
});
