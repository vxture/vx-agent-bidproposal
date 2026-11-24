/**
 * @package @bidproposal/workbench
 * @layer Infrastructure
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectAssets, applicationAssets } from '../assets.mjs';
import { businessContract } from '../contract.mjs';

test('both deliverables contain exactly the same application bytes with no desktop host dependency', () => {
  const web = collectAssets('export const environment = "web";');
  const desktop = collectAssets('export const environment = "desktop";', [{ name: 'bridge.mjs', data: Buffer.from('transport') }]);
  const shared = applicationAssets();
  for (const asset of shared) {
    assert.deepEqual(web.find(entry => entry.name === asset.name).data, desktop.find(entry => entry.name === asset.name).data);
    if (asset.name.endsWith('.mjs')) assert.doesNotMatch(asset.data.toString(), /hostOrigin|ruyin\.navigation|ruyin\.bridge|postMessage\(/);
  }
  assert.ok(shared.some(asset => asset.name === 'app.mjs'));
  assert.ok(shared.some(asset => asset.name === 'library-ui.mjs'));
  assert.ok(web.some(asset => asset.name === 'vendor-pdf-worker.mjs'));
  assert.ok(web.some(asset => asset.name === 'dompurify-LICENSE.txt'));
  assert.equal(web.some(asset => asset.name.endsWith('.test.mjs')), false);
  assert.throws(() => collectAssets('', [{ name: 'app.mjs', data: Buffer.alloc(0) }]), /Duplicate/);
});

test('task definitions are assembled once for every environment without changing base metadata', () => {
  const base = readFileSync(new URL('../../../app/contract/ruyin.product.yaml', import.meta.url), 'utf8');
  const contract = businessContract(base);
  for (const task of ['analyze_tender', 'plan_outline', 'write_chapter', 'review_chapter', 'analyze_tender_batch', 'verify_tender_sources', 'draft_tender_clarifications', 'extract_enterprise_facts', 'match_enterprise_evidence']) {
    assert.equal(contract.split('  - id: ' + task + '\n').length, 2, task);
  }
  assert.match(contract, /id: bidproposal/);
  assert.match(contract, /version: 1\.0\.0/);
  assert.match(contract, /verification chapter_source_consistency/i);
  assert.doesNotMatch(contract, /sha256:|SIGNED|SIGNATURE/);
  assert.equal(businessContract(base.replace(/\r?\n/g, '\r\n')), contract);
});
