/**
 * @package @bidproposal/app
 * @layer Application
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createAuthContextResolver } from "./session";
import { getOidcConfig } from "./config";
import type { RpSession } from "./session-store";

function fixture() {
  let saved: RpSession | null = {
    idToken: "id",
    accessToken: "old",
    refreshToken: "rotation-1",
    accessExpiresAt: 0,
    sub: "member",
    sid: "sid",
  };
  let release!: () => void;
  const gate = new Promise<void>((done) => {
    release = done;
  });
  let refreshes = 0;
  const resolve = createAuthContextResolver({
    read: async () => saved && { ...saved },
    replace: async (_cid, _rpsid, previous, next) => {
      if (JSON.stringify(saved) !== JSON.stringify(previous)) return false;
      saved = next;
      return true;
    },
    refresh: async () => {
      refreshes++;
      await gate;
      return {
        access_token: "new",
        refresh_token: "rotation-2",
        token_type: "Bearer",
        expires_in: 300,
      };
    },
    verify: async () => ({
      sub: "member",
      iss: "https://synthetic.test",
      aud: "bidproposal",
    }),
  });
  return {
    resolve,
    release,
    refreshes: () => refreshes,
    saved: () => saved,
    revoke: () => {
      saved = null;
    },
  };
}

test("parallel RP reads rotate once and persist the current refresh token", async () => {
  const f = fixture(),
    cfg = getOidcConfig();
  const pending = Array.from({ length: 24 }, () => f.resolve(cfg, "opaque"));
  await new Promise((done) => setImmediate(done));
  assert.equal(f.refreshes(), 1);
  f.release();
  const values = await Promise.all(pending);
  assert.ok(values.every((value) => value?.accessToken === "new"));
  assert.equal(f.saved()?.refreshToken, "rotation-2");
  await f.resolve(cfg, "opaque");
  assert.equal(f.refreshes(), 1);
});

test("logout during refresh cannot resurrect the deleted session or return its token", async () => {
  const f = fixture(),
    cfg = getOidcConfig();
  const pending = f.resolve(cfg, "opaque");
  await new Promise((done) => setImmediate(done));
  f.revoke();
  f.release();
  assert.equal(await pending, null);
  assert.equal(f.saved(), null);
  assert.equal(await f.resolve(cfg, "opaque"), null);
});
