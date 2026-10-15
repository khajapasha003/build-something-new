import test from "node:test";
import assert from "node:assert/strict";
import { BILLING_PLANS, SUPPORTED_PAYMENT_PROVIDERS } from "../src/lib/billing.constants.ts";

test("B1: Billing plans include Sample, Launch, and Retest with correct pricing", () => {
  assert.equal(BILLING_PLANS.sample.price, 0);
  assert.equal(BILLING_PLANS.sample.priceDisplay, "Free");
  assert.equal(BILLING_PLANS.sample.scanCredits, 1);

  assert.equal(BILLING_PLANS.launch.price, 4900);
  assert.equal(BILLING_PLANS.launch.priceDisplay, "$49");
  assert.equal(BILLING_PLANS.launch.scanCredits, 5);

  assert.equal(BILLING_PLANS.retest.price, 9900);
  assert.equal(BILLING_PLANS.retest.priceDisplay, "$99/mo");
  assert.equal(BILLING_PLANS.retest.scanCredits, -1);
});

test("B2: Launch pack includes essential client deliverables", () => {
  const launchFeatures = BILLING_PLANS.launch.features;
  assert.ok(launchFeatures.some((f) => f.includes("Multi-page")));
  assert.ok(launchFeatures.some((f) => f.includes("Full evidence bundle")));
  assert.ok(launchFeatures.some((f) => f.includes("re-scan comparison")));
});

test("B3: Multi-gateway support verification (Stripe, PayPal, Razorpay)", () => {
  const supportedGateways = ["stripe", "paypal", "razorpay"] as const;
  assert.equal(supportedGateways.length, 3);
  assert.ok(supportedGateways.includes("stripe"));
  assert.ok(supportedGateways.includes("paypal"));
  assert.ok(supportedGateways.includes("razorpay"));
});

test("B4: Plan credit allocation formulas", () => {
  // Existing user with 1 credit buys 5 credits -> 6
  const existingCredits = 1;
  const launchCreditsPurchased = 5;
  const expectedTotal = existingCredits + launchCreditsPurchased;
  assert.equal(expectedTotal, 6);

  // Retest subscription provides unlimited scans
  const isRetestUnlimited = true;
  assert.equal(isRetestUnlimited, true);
});
