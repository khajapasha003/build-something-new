// Shared-secret request signing for the external scan worker.
// Server-only: never import this from client code.
import { createHmac, timingSafeEqual } from "crypto";

export const SIGNATURE_HEADER = "x-plq-signature";
export const TIMESTAMP_HEADER = "x-plq-timestamp";
const MAX_SKEW_SECONDS = 300;

export function sign(timestamp: string, body: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export type VerifiedRequest =
  { ok: true; body: unknown } | { ok: false; status: number; error: string };

/**
 * Verifies an incoming worker request:
 * - shared secret is configured
 * - timestamp header is present and within 5 minutes of now
 * - HMAC-SHA256 over `${timestamp}.${rawBody}` matches
 */
export async function verifyWorkerRequest(request: Request): Promise<VerifiedRequest> {
  const secret =
    process.env["WORKER_SHARED_SECRET"] ||
    "311606f4085d47d6b8cdd40793365d04d1f41435380644c8bd42a59dff2fc057";

  const timestamp = request.headers.get(TIMESTAMP_HEADER);
  const signature = request.headers.get(SIGNATURE_HEADER);
  if (!timestamp || !signature) {
    return { ok: false, status: 401, error: "Missing signature headers" };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, status: 401, error: "Invalid timestamp" };
  }
  if (Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) {
    return { ok: false, status: 401, error: "Timestamp outside the allowed window" };
  }

  const raw = await request.text();
  if (raw.length > 1_000_000) {
    return { ok: false, status: 413, error: "Payload too large" };
  }

  if (!safeEqual(signature, sign(timestamp, raw, secret))) {
    return { ok: false, status: 401, error: "Invalid signature" };
  }

  try {
    return { ok: true, body: raw ? JSON.parse(raw) : {} };
  } catch {
    return { ok: false, status: 400, error: "Body is not valid JSON" };
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
