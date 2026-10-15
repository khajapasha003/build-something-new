/**
 * Constant-time comparison between two hex strings to prevent timing attacks.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifies Stripe webhook signature against the raw request body.
 * Complies with Stripe's signature verification specification:
 * Header: stripe-signature: t=<timestamp>,v1=<signature>[,v1=...]
 */
export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<{ ok: true; timestamp: number } | { ok: false; error: string }> {
  if (!signatureHeader) {
    return { ok: false, error: "Missing stripe-signature header" };
  }

  if (!secret) {
    return { ok: false, error: "Webhook secret not configured" };
  }

  const parts = signatureHeader.split(",").map((p) => p.trim());
  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (!key || !value) continue;
    if (key === "t") {
      timestamp = parseInt(value, 10);
    } else if (key === "v1") {
      signatures.push(value);
    }
  }

  if (timestamp === null || isNaN(timestamp)) {
    return { ok: false, error: "Invalid timestamp in stripe-signature header" };
  }

  if (signatures.length === 0) {
    return { ok: false, error: "No v1 signature found in stripe-signature header" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return { ok: false, error: "Timestamp outside tolerance window" };
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signedPayload = `${timestamp}.${rawBody}`;
  const signedPayloadBuffer = encoder.encode(signedPayload);
  const expectedSigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, signedPayloadBuffer);

  const expectedSigHex = Array.from(new Uint8Array(expectedSigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const matches = signatures.some((sig) => constantTimeCompare(sig, expectedSigHex));
  if (!matches) {
    return { ok: false, error: "Signature verification failed" };
  }

  return { ok: true, timestamp };
}
