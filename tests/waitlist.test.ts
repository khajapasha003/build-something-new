import test from "node:test";
import assert from "node:assert/strict";
import {
  computeIpHash,
  getTrustedClientIp,
  processSignup,
  GENERIC_ERROR_MESSAGE,
  RATE_LIMIT_ERROR_MESSAGE,
  type WaitlistDb,
  type SignupPayload,
} from "../src/lib/waitlist.service.ts";

async function plainSha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const samplePayload: SignupPayload = {
  email: "test@example.com",
  websiteUrl: "https://example.com",
  builder: "Lovable",
  consentMarketing: true,
  intent: "waitlist",
};

test("T1: same IP + same key -> same hash; different key -> different hash; hash != plain SHA-256 hex of the IP", async () => {
  const ip = "198.51.100.42";
  const keyA = "secret-key-alpha";
  const keyB = "secret-key-beta";

  const hashA1 = await computeIpHash(ip, keyA);
  const hashA2 = await computeIpHash(ip, keyA);
  const hashB = await computeIpHash(ip, keyB);
  const unkeyed = await plainSha256(ip);

  assert.equal(hashA1, hashA2);
  assert.notEqual(hashA1, hashB);
  assert.notEqual(hashA1, unkeyed);
  assert.equal(/^[0-9a-f]{64}$/.test(hashA1), true);
});

test("T2: cf-connecting-ip 203.0.113.7 + x-forwarded-for 1.2.3.4 -> 203.0.113.7", () => {
  const ip = getTrustedClientIp({
    cfConnectingIp: "203.0.113.7",
    xForwardedFor: "1.2.3.4",
  });
  assert.equal(ip, "203.0.113.7");
});

test('T3: only x-forwarded-for "1.2.3.4, 5.6.7.8" -> 1.2.3.4', () => {
  const ip = getTrustedClientIp({
    xForwardedFor: "1.2.3.4, 5.6.7.8",
  });
  assert.equal(ip, "1.2.3.4");
});

test("T4: missing key -> generic error, fake db receives 0 calls", async () => {
  let dbCalls = 0;
  const fakeDb: WaitlistDb = {
    async countRecentByIpHash() {
      dbCalls++;
      return { count: 0, error: null };
    },
    async insert() {
      dbCalls++;
      return { error: null };
    },
  };

  const result1 = await processSignup(
    samplePayload,
    { cfConnectingIp: "1.2.3.4" },
    undefined,
    fakeDb,
  );
  assert.deepEqual(result1, { ok: false, error: GENERIC_ERROR_MESSAGE });
  assert.equal(dbCalls, 0);

  const result2 = await processSignup(samplePayload, { cfConnectingIp: "1.2.3.4" }, "", fakeDb);
  assert.deepEqual(result2, { ok: false, error: GENERIC_ERROR_MESSAGE });
  assert.equal(dbCalls, 0);

  const result3 = await processSignup(samplePayload, { cfConnectingIp: "1.2.3.4" }, "   ", fakeDb);
  assert.deepEqual(result3, { ok: false, error: GENERIC_ERROR_MESSAGE });
  assert.equal(dbCalls, 0);
});

test("T5: insert returns code 23505 -> { ok: true }, no update/upsert call", async () => {
  let insertCalled = false;
  let updateCalled = false;

  const fakeDb = {
    async countRecentByIpHash() {
      return { count: 0, error: null };
    },
    async insert() {
      insertCalled = true;
      return { error: { code: "23505", message: "unique violation" } };
    },
    async update() {
      updateCalled = true;
      return { error: null };
    },
    async upsert() {
      updateCalled = true;
      return { error: null };
    },
  } as unknown as WaitlistDb;

  const result = await processSignup(
    samplePayload,
    { cfConnectingIp: "1.2.3.4" },
    "test-key",
    fakeDb,
  );
  assert.deepEqual(result, { ok: true });
  assert.equal(insertCalled, true);
  assert.equal(updateCalled, false);
});

test("T6: insert returns another error -> generic error", async () => {
  const fakeDb: WaitlistDb = {
    async countRecentByIpHash() {
      return { count: 0, error: null };
    },
    async insert() {
      return { error: { code: "42P01", message: "relation does not exist" } };
    },
  };

  const result = await processSignup(
    samplePayload,
    { cfConnectingIp: "1.2.3.4" },
    "test-key",
    fakeDb,
  );
  assert.deepEqual(result, { ok: false, error: GENERIC_ERROR_MESSAGE });
});

test('T7: rate-limit count >= 5 -> "Too many submissions" error, no insert call', async () => {
  let insertCalls = 0;
  const fakeDb: WaitlistDb = {
    async countRecentByIpHash() {
      return { count: 5, error: null };
    },
    async insert() {
      insertCalls++;
      return { error: null };
    },
  };

  const result = await processSignup(
    samplePayload,
    { cfConnectingIp: "1.2.3.4" },
    "test-key",
    fakeDb,
  );
  assert.deepEqual(result, { ok: false, error: RATE_LIMIT_ERROR_MESSAGE });
  assert.equal(insertCalls, 0);
});
