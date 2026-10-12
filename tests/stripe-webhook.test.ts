import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import { verifyStripeSignature } from "../src/routes/api/public/stripe/webhook.ts";

function generateStripeSignature(payload: string, secret: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

test("Stripe Webhook: valid signature and current timestamp passes", async () => {
  const secret = "whsec_test_secret_key_12345";
  const body = JSON.stringify({ type: "checkout.session.completed", id: "evt_123" });
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureHeader = generateStripeSignature(body, secret, timestamp);

  const res = await verifyStripeSignature(body, signatureHeader, secret);
  assert.strictEqual(res.ok, true);
  if (res.ok) {
    assert.strictEqual(res.timestamp, timestamp);
  }
});

test("Stripe Webhook: missing signature header fails", async () => {
  const secret = "whsec_test_secret_key_12345";
  const body = JSON.stringify({ type: "checkout.session.completed" });

  const res = await verifyStripeSignature(body, null, secret);
  assert.strictEqual(res.ok, false);
  if (!res.ok) {
    assert.match(res.error, /Missing stripe-signature header/);
  }
});

test("Stripe Webhook: tampered body fails signature check", async () => {
  const secret = "whsec_test_secret_key_12345";
  const body = JSON.stringify({ type: "checkout.session.completed", amount: 4900 });
  const tampered = JSON.stringify({ type: "checkout.session.completed", amount: 0 });
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureHeader = generateStripeSignature(body, secret, timestamp);

  const res = await verifyStripeSignature(tampered, signatureHeader, secret);
  assert.strictEqual(res.ok, false);
  if (!res.ok) {
    assert.match(res.error, /Signature verification failed/);
  }
});

test("Stripe Webhook: expired timestamp fails replay protection", async () => {
  const secret = "whsec_test_secret_key_12345";
  const body = JSON.stringify({ type: "checkout.session.completed" });
  // Timestamp 10 minutes in the past (> 300s tolerance)
  const timestamp = Math.floor(Date.now() / 1000) - 600;
  const signatureHeader = generateStripeSignature(body, secret, timestamp);

  const res = await verifyStripeSignature(body, signatureHeader, secret);
  assert.strictEqual(res.ok, false);
  if (!res.ok) {
    assert.match(res.error, /outside tolerance window/);
  }
});
