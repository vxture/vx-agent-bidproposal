/**
 * @package @bidproposal/app
 * @layer Infrastructure
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from "node:test";
import assert from "node:assert/strict";
import { limitReaders } from "./reader-limit";
test("reader slots are bounded across workspaces and cancelled queued work does not start", async () => {
  const releases: Array<() => void> = [];
  let started = 0;
  const read = limitReaders(
    async () => {
      started++;
      await new Promise<void>((done) => releases.push(done));
    },
    1,
    3,
  );
  const args = [Buffer.from("x"), "md", () => {}, () => {}] as const;
  const first = read(...args);
  await new Promise((done) => setImmediate(done));
  const abort = new AbortController(),
    second = read(...args, abort.signal);
  const rejected = assert.rejects(second, /cancelled/);
  abort.abort();
  await rejected;
  const third = read(...args),
    fourth = read(...args);
  await assert.rejects(read(...args), /busy/);
  assert.equal(started, 1);
  releases.shift()!();
  await first;
  await new Promise((done) => setImmediate(done));
  assert.equal(started, 2);
  releases.shift()!();
  await third;
  await new Promise((done) => setImmediate(done));
  assert.equal(started, 3);
  releases.shift()!();
  await fourth;
});
