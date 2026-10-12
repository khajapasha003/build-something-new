import test from "node:test";
import assert from "node:assert/strict";

import { TICKET_CATEGORIES } from "../src/lib/support.functions.ts";
import { BILLING_PLANS } from "../src/lib/billing.functions.ts";

test("Support: ticket categories are defined and distinct", () => {
  assert.strictEqual(TICKET_CATEGORIES.length >= 5, true);
  const set = new Set(TICKET_CATEGORIES);
  assert.strictEqual(set.size, TICKET_CATEGORIES.length);
  assert.strictEqual(set.has("billing"), true);
  assert.strictEqual(set.has("verification"), true);
  assert.strictEqual(set.has("scan_issue"), true);
});

test("Billing: plans contain required pricing structures", () => {
  assert.strictEqual(BILLING_PLANS.sample.price, 0);
  assert.strictEqual(BILLING_PLANS.sample.scanCredits, 1);

  assert.strictEqual(BILLING_PLANS.launch.price, 4900);
  assert.strictEqual(BILLING_PLANS.launch.scanCredits, 5);

  assert.strictEqual(BILLING_PLANS.retest.price, 9900);
  assert.strictEqual(BILLING_PLANS.retest.type, "subscription");
});
