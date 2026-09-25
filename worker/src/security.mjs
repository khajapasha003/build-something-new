import dns from "node:dns/promises";
import net from "node:net";

/**
 * Checks if an IP address is a private, loopback, link-local, CGNAT,
 * multicast, broadcast, or reserved address.
 * Covers the same ranges as src/lib/verification.server.ts:59-85,
 * including IPv4-mapped IPv6 (::ffff:x.x.x.x).
 *
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateIp(ip) {
  if (typeof ip !== "string") return true;
  const trimmed = ip.trim();

  if (trimmed.includes(":")) {
    const h = trimmed.toLowerCase();
    if (h === "::" || h === "::1") return true;
    if (h.startsWith("fe80") || h.startsWith("fc") || h.startsWith("fd")) return true;
    if (h.startsWith("ff")) return true;
    const mapped = h.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped?.[1]) return isPrivateIp(mapped[1]);
    return false;
  }

  const parts = trimmed.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }

  const [a, b] = parts;
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

/**
 * Validates that a target URL is safe to scan in daemon mode:
 * 1. Target origin must match the claimed verified origin.
 * 2. Hostname must not resolve to any private or restricted IP addresses.
 *
 * @param {string} targetUrl
 * @param {string} [origin]
 * @returns {Promise<{ safe: boolean, reason?: string }>}
 */
export async function checkTargetSafety(targetUrl, origin = null) {
  try {
    const parsedTarget = new URL(targetUrl);

    if (origin) {
      const parsedOrigin = new URL(origin);
      if (parsedTarget.origin !== parsedOrigin.origin) {
        return {
          safe: false,
          reason: `Target origin ${parsedTarget.origin} does not match verified site ${parsedOrigin.origin}`,
        };
      }
    }

    const host = parsedTarget.hostname;

    // Check if host is an IP literal
    if (net.isIP(host) || isPrivateIp(host)) {
      if (isPrivateIp(host)) {
        return {
          safe: false,
          reason: `Target address ${host} is a private or restricted address`,
        };
      }
    } else {
      // Resolve DNS to check all returned addresses
      try {
        const addresses = await dns.lookup(host, { all: true });
        for (const addr of addresses) {
          if (isPrivateIp(addr.address)) {
            return {
              safe: false,
              reason: `Target address resolves to private or restricted address: ${addr.address}`,
            };
          }
        }
      } catch (err) {
        return {
          safe: false,
          reason: `Could not resolve hostname ${host}: ${err.message}`,
        };
      }
    }

    return { safe: true };
  } catch (err) {
    return {
      safe: false,
      reason: `Invalid target URL: ${err.message}`,
    };
  }
}
