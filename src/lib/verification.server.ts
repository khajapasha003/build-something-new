/**
 * Server-only ownership verification helpers.
 * Never import this from a component; only from server function handlers.
 */

const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 3;

export const MANAGED_SUBDOMAIN_SUFFIXES = [
  ".lovable.app",
  ".lovableproject.com",
  ".vercel.app",
  ".netlify.app",
  ".pages.dev",
  ".github.io",
  ".web.app",
  ".firebaseapp.com",
  ".replit.app",
  ".repl.co",
  ".onrender.com",
  ".fly.dev",
];

export function isManagedHost(host: string): boolean {
  const h = host.toLowerCase();
  return MANAGED_SUBDOMAIN_SUFFIXES.some((suffix) => h.endsWith(suffix));
}

export type NormalizedTarget = { origin: string; host: string };

export function normalizeOrigin(rawUrl: string): NormalizedTarget | { error: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { error: "Enter a full URL, for example https://yourapp.com" };
  }
  if (parsed.protocol !== "https:") return { error: "Only https:// addresses can be verified." };
  if (parsed.port && parsed.port !== "443") return { error: "Custom ports are not supported." };
  const host = parsed.hostname.toLowerCase();
  if (!host.includes(".")) return { error: "That does not look like a public domain." };
  if (isBlockedHostname(host)) return { error: "That address is not publicly reachable." };
  return { origin: `https://${host}`, host };
}

function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h === "metadata.google.internal"
  );
}

/** Blocks loopback, private, link-local (incl. 169.254.169.254), CGNAT, reserved. */
export function isBlockedIp(ip: string): boolean {
  if (ip.includes(":")) return isBlockedIpv6(ip);
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true; // multicast + reserved + broadcast
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const h = ip.toLowerCase();
  if (h === "::" || h === "::1") return true;
  if (h.startsWith("fe80") || h.startsWith("fc") || h.startsWith("fd")) return true;
  if (h.startsWith("ff")) return true;
  const mapped = h.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isBlockedIp(mapped[1]);
  return false;
}

type DohAnswer = { type: number; data: string };

async function dohQuery(name: string, type: "A" | "AAAA" | "TXT"): Promise<DohAnswer[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${DOH_ENDPOINT}?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { accept: "application/dns-json" }, signal: controller.signal },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { Answer?: DohAnswer[] };
    return body.Answer ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Resolves a host and fails closed if it does not resolve or any address is private. */
export async function assertPublicHost(host: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (isBlockedHostname(host)) return { ok: false, reason: `Blocked hostname: ${host}` };
  const [a, aaaa] = await Promise.all([dohQuery(host, "A"), dohQuery(host, "AAAA")]);
  const ips = [...a, ...aaaa]
    .filter((ans) => ans.type === 1 || ans.type === 28)
    .map((ans) => ans.data.trim());
  if (ips.length === 0) return { ok: false, reason: `DNS did not resolve ${host}` };
  const blocked = ips.find((ip) => isBlockedIp(ip));
  if (blocked) return { ok: false, reason: `${host} resolves to a non-public address (${blocked})` };
  return { ok: true };
}

export type SafeFetchResult =
  | { ok: true; body: string; finalUrl: string }
  | { ok: false; reason: string };

/** https-only fetch: DNS-checked every hop, max 3 redirects, same registered origin, 5s, 1 MB. */
export async function safeFetch(startUrl: string, registeredOrigin: string): Promise<SafeFetchResult> {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let url: URL;
    try {
      url = new URL(current);
    } catch {
      return { ok: false, reason: `Invalid URL: ${current}` };
    }
    if (url.protocol !== "https:") return { ok: false, reason: `Non-https URL rejected: ${url.protocol}//` };
    if (url.port && url.port !== "443") return { ok: false, reason: "Custom ports are not allowed" };

    const dns = await assertPublicHost(url.hostname);
    if (!dns.ok) return { ok: false, reason: dns.reason };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": "PreLaunchQA-Verifier/1.0", accept: "text/html,text/plain,*/*" },
      });
    } catch (error) {
      clearTimeout(timer);
      return { ok: false, reason: `Request failed: ${(error as Error).message}` };
    }
    clearTimeout(timer);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return { ok: false, reason: `Redirect ${res.status} without a location header` };
      if (hop === MAX_REDIRECTS) return { ok: false, reason: "Too many redirects (max 3)" };
      current = new URL(location, url).toString();
      continue;
    }

    if (`https://${url.hostname}` !== registeredOrigin) {
      return {
        ok: false,
        reason: `Final address ${url.hostname} does not match the registered origin ${registeredOrigin}`,
      };
    }

    if (!res.ok) return { ok: false, reason: `Server responded ${res.status}` };

    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared > MAX_BYTES) return { ok: false, reason: "Response larger than 1 MB" };

    const body = await readLimited(res);
    if (body === null) return { ok: false, reason: "Response larger than 1 MB" };
    return { ok: true, body, finalUrl: url.toString() };
  }
  return { ok: false, reason: "Too many redirects (max 3)" };
}

async function readLimited(res: Response): Promise<string | null> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export type VerifyOutcome = { verified: boolean; reason: string };

export async function verifyDns(host: string, token: string): Promise<VerifyOutcome> {
  const name = `_prelaunchqa.${host}`;
  const answers = await dohQuery(name, "TXT");
  const values = answers
    .filter((ans) => ans.type === 16)
    .map((ans) => ans.data.replace(/^"|"$/g, "").replace(/""/g, "").trim());
  if (values.length === 0) return { verified: false, reason: `No TXT record found at ${name}` };
  const expected = `prelaunchqa-verify=${token}`;
  if (values.includes(expected)) return { verified: true, reason: `TXT record at ${name} matched` };
  return { verified: false, reason: `TXT record found at ${name} but the value did not match` };
}

export async function verifyMeta(origin: string, token: string): Promise<VerifyOutcome> {
  const result = await safeFetch(`${origin}/`, origin);
  if (!result.ok) return { verified: false, reason: result.reason };
  const head = result.body.slice(0, 200_000);
  const re = /<meta[^>]+name=["']prelaunchqa-verify["'][^>]*>/gi;
  for (const tag of head.match(re) ?? []) {
    const content = tag.match(/content=["']([^"']+)["']/i)?.[1]?.trim();
    if (content === token) return { verified: true, reason: "Meta tag on the homepage matched" };
  }
  return { verified: false, reason: "No matching prelaunchqa-verify meta tag on the homepage" };
}

export async function verifyFile(origin: string, token: string): Promise<VerifyOutcome> {
  const result = await safeFetch(`${origin}/.well-known/prelaunchqa.txt`, origin);
  if (!result.ok) return { verified: false, reason: result.reason };
  if (result.body.trim() === token) return { verified: true, reason: "Verification file matched" };
  return { verified: false, reason: "Verification file found but its contents did not match" };
}
