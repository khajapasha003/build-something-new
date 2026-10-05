export interface ClientIpHeaders {
  cfConnectingIp?: string | null | undefined;
  xRealIp?: string | null | undefined;
  xForwardedFor?: string | null | undefined;
  fallbackHostname?: string | null | undefined;
}

export interface WaitlistRecord {
  email: string;
  website_url: string;
  builder: string;
  intent: "waitlist" | "preorder";
  consent_marketing: boolean;
  ip_hash: string;
}

export interface WaitlistDb {
  countRecentByIpHash(
    ipHash: string,
    sinceIso: string,
  ): Promise<{ count: number | null; error: unknown }>;
  insert(record: WaitlistRecord): Promise<{ error: { code?: string; message?: string } | null }>;
}

export interface SignupPayload {
  email: string;
  websiteUrl: string;
  builder: string;
  consentMarketing: boolean;
  intent: "waitlist" | "preorder";
}

export type SignupResult = { ok: true } | { ok: false; error: string };

export const GENERIC_ERROR_MESSAGE = "We could not save your details. Please try again shortly.";
export const RATE_LIMIT_ERROR_MESSAGE =
  "Too many submissions from this network. Try again in an hour.";
export const RATE_LIMIT_PER_HOUR = 5;

export async function computeIpHash(ip: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(ip));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function getTrustedClientIp(headers: ClientIpHeaders): string {
  if (headers.cfConnectingIp && headers.cfConnectingIp.trim().length > 0) {
    return headers.cfConnectingIp.trim();
  }
  if (headers.xRealIp && headers.xRealIp.trim().length > 0) {
    return headers.xRealIp.trim();
  }
  if (headers.xForwardedFor && headers.xForwardedFor.trim().length > 0) {
    const first = headers.xForwardedFor.split(",")[0]?.trim();
    if (first && first.length > 0) return first;
  }
  return headers.fallbackHostname?.trim() || "";
}

export async function processSignup(
  payload: SignupPayload,
  headers: ClientIpHeaders,
  ipHashKey: string | undefined,
  db: WaitlistDb,
): Promise<SignupResult> {
  if (!ipHashKey || ipHashKey.trim().length === 0) {
    console.error("IP_HASH_KEY is missing or empty");
    return { ok: false, error: GENERIC_ERROR_MESSAGE };
  }

  const clientIp = getTrustedClientIp(headers);
  const ipHash = await computeIpHash(clientIp, ipHashKey);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await db.countRecentByIpHash(ipHash, oneHourAgo);

  if (countError) {
    console.error("waitlist rate-limit check failed", countError);
    return { ok: false, error: GENERIC_ERROR_MESSAGE };
  }

  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return { ok: false, error: RATE_LIMIT_ERROR_MESSAGE };
  }

  const { error: insertError } = await db.insert({
    email: payload.email.toLowerCase(),
    website_url: payload.websiteUrl,
    builder: payload.builder,
    intent: payload.intent,
    consent_marketing: payload.consentMarketing,
    ip_hash: ipHash,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: true };
    }
    console.error("waitlist insert failed", insertError);
    return { ok: false, error: GENERIC_ERROR_MESSAGE };
  }

  return { ok: true };
}
