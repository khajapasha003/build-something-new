import dns from "node:dns/promises";
import net from "node:net";

/**
 * Normalizes lookup results into an array of IP address strings.
 *
 * @param {any} res
 * @returns {string[]}
 */
export function extractAddresses(res) {
  if (!res) return [];
  if (typeof res === "string") return [res];
  if (Array.isArray(res)) {
    return res.map((item) => (typeof item === "string" ? item : item?.address)).filter(Boolean);
  }
  if (typeof res === "object" && res.address) {
    return [res.address];
  }
  return [];
}

/**
 * Checks if an IPv4 octet quadruple is a private, loopback, link-local, CGNAT,
 * multicast, broadcast, or reserved address.
 *
 * @param {number} a
 * @param {number} b
 * @param {number} c
 * @param {number} d
 * @returns {boolean}
 */
function isPrivateIpv4(a, b, c, d) {
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT (100.64.0.0/10)
  if (a === 169 && b === 254) return true; // link-local + cloud metadata (169.254.0.0/16)
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC 1918 (172.16.0.0/12)
  if (a === 192 && b === 0) return true; // 192.0.0.0/24, 192.0.2.0/24
  if (a === 192 && b === 168) return true; // RFC 1918 (192.168.0.0/16)
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark (198.18.0.0/15)
  if (a >= 224) return true; // multicast + reserved + broadcast (224.0.0.0/4)
  return false;
}

/**
 * Parses an IPv6 string into 8 16-bit integer hextets (0..65535).
 * Expands "::" and handles dual IPv4-mapped notation (e.g. ::ffff:127.0.0.1).
 *
 * @param {string} ipStr
 * @returns {number[]|null} Array of 8 hextets, or null if invalid
 */
function parseIpv6(ipStr) {
  let str = ipStr.toLowerCase().trim();
  const zoneIndex = str.indexOf("%");
  if (zoneIndex !== -1) {
    str = str.slice(0, zoneIndex);
  }

  // Handle embedded IPv4 dotted notation at end (e.g. ::ffff:192.168.1.1)
  const lastColon = str.lastIndexOf(":");
  if (lastColon !== -1) {
    const lastPart = str.slice(lastColon + 1);
    if (lastPart.includes(".")) {
      const v4Parts = lastPart.split(".");
      if (v4Parts.length === 4) {
        const nums = v4Parts.map(Number);
        if (nums.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
          const high = (nums[0] << 8) | nums[1];
          const low = (nums[2] << 8) | nums[3];
          str = str.slice(0, lastColon + 1) + high.toString(16) + ":" + low.toString(16);
        }
      }
    }
  }

  const doubleColonIndex = str.indexOf("::");
  let leftParts = [];
  let rightParts = [];

  if (doubleColonIndex !== -1) {
    const leftStr = str.slice(0, doubleColonIndex);
    const rightStr = str.slice(doubleColonIndex + 2);
    if (leftStr.length > 0) {
      leftParts = leftStr.split(":").map((p) => parseInt(p, 16));
    }
    if (rightStr.length > 0) {
      rightParts = rightStr.split(":").map((p) => parseInt(p, 16));
    }
    const missingCount = 8 - (leftParts.length + rightParts.length);
    if (missingCount < 0) return null;
    const zeros = new Array(missingCount).fill(0);
    return [...leftParts, ...zeros, ...rightParts];
  } else {
    const parts = str.split(":").map((p) => parseInt(p, 16));
    if (parts.length !== 8) return null;
    return parts;
  }
}

/**
 * Checks if 8 IPv6 hextets fall into private or restricted ranges:
 * - ::/128, ::1/128
 * - ::ffff:0:0/96 (IPv4-mapped, check embedded IPv4)
 * - 64:ff9b::/96 (NAT64, check embedded IPv4)
 * - 2002::/16 (6to4, check embedded IPv4)
 * - fc00::/7 (ULA)
 * - fe80::/10 (Link-Local)
 * - ff00::/8 (Multicast)
 * - 2001:db8::/32 (Documentation)
 * - 100::/64 (Discard-only)
 *
 * @param {number[]} hextets
 * @returns {boolean}
 */
function isPrivateIpv6(hextets) {
  // ::/128
  if (hextets.every((h) => h === 0)) return true;

  // ::1/128
  if (hextets.slice(0, 7).every((h) => h === 0) && hextets[7] === 1) return true;

  // ::ffff:0:0/96 (check embedded IPv4)
  if (hextets.slice(0, 5).every((h) => h === 0) && hextets[5] === 0xffff) {
    const a = (hextets[6] >> 8) & 0xff;
    const b = hextets[6] & 0xff;
    const c = (hextets[7] >> 8) & 0xff;
    const d = hextets[7] & 0xff;
    return isPrivateIpv4(a, b, c, d);
  }

  // 64:ff9b::/96 (NAT64, check embedded IPv4)
  if (hextets[0] === 0x0064 && hextets[1] === 0xff9b && hextets.slice(2, 6).every((h) => h === 0)) {
    const a = (hextets[6] >> 8) & 0xff;
    const b = hextets[6] & 0xff;
    const c = (hextets[7] >> 8) & 0xff;
    const d = hextets[7] & 0xff;
    return isPrivateIpv4(a, b, c, d);
  }

  // 2002::/16 (6to4, check embedded IPv4 in hextets 1 and 2)
  if (hextets[0] === 0x2002) {
    const a = (hextets[1] >> 8) & 0xff;
    const b = hextets[1] & 0xff;
    const c = (hextets[2] >> 8) & 0xff;
    const d = hextets[2] & 0xff;
    return isPrivateIpv4(a, b, c, d);
  }

  // fc00::/7 (ULA)
  if ((hextets[0] & 0xfe00) === 0xfc00) return true;

  // fe80::/10 (Link-Local)
  if ((hextets[0] & 0xffc0) === 0xfe80) return true;

  // ff00::/8 (Multicast)
  if ((hextets[0] & 0xff00) === 0xff00) return true;

  // 2001:db8::/32 (Documentation)
  if (hextets[0] === 0x2001 && hextets[1] === 0x0db8) return true;

  // 100::/64 (Discard-only)
  if (hextets[0] === 0x0100 && hextets[1] === 0 && hextets[2] === 0 && hextets[3] === 0) {
    return true;
  }

  return false;
}

/**
 * Checks if an IP literal address is a private, loopback, link-local, CGNAT,
 * multicast, broadcast, or reserved address.
 * Called only with IP literals (net.isIP(ip) !== 0).
 * Hostnames must go through the resolver first.
 * Strips [ ] from IPv6 literal hostnames before checking.
 *
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateIp(ip) {
  if (typeof ip !== "string") return true;
  let clean = ip.trim();
  if (clean.startsWith("[") && clean.endsWith("]")) {
    clean = clean.slice(1, -1).trim();
  }

  const ver = net.isIP(clean);
  if (ver === 4) {
    const parts = clean.split(".").map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return true;
    }
    return isPrivateIpv4(parts[0], parts[1], parts[2], parts[3]);
  }
  if (ver === 6) {
    const hextets = parseIpv6(clean);
    if (!hextets) return true;
    return isPrivateIpv6(hextets);
  }

  return true;
}

/**
 * Validates that a target URL is safe to scan in daemon mode:
 * 1. Target origin must match the claimed verified origin.
 * 2. Hostname must not resolve to any private or restricted IP addresses.
 *
 * @param {string} targetUrl
 * @param {string|object} [origin=null]
 * @param {object} [options={}]
 * @param {Function} [options.lookup]
 * @returns {Promise<{ safe: boolean, reason?: string }>}
 */
export async function checkTargetSafety(targetUrl, origin = null, options = {}) {
  let opts = options;
  let orig = origin;
  if (origin && typeof origin === "object" && typeof origin !== "string") {
    opts = origin;
    orig = null;
  }
  const lookup = opts?.lookup || ((host, opt) => dns.lookup(host, opt));

  try {
    const parsedTarget = new URL(targetUrl);

    if (orig) {
      const parsedOrigin = new URL(orig);
      if (parsedTarget.origin !== parsedOrigin.origin) {
        return {
          safe: false,
          reason: `Target origin ${parsedTarget.origin} does not match verified site ${parsedOrigin.origin}`,
        };
      }
    }

    let host = parsedTarget.hostname;
    if (host.startsWith("[") && host.endsWith("]")) {
      host = host.slice(1, -1);
    }

    // Check if host is an IP literal
    if (net.isIP(host) !== 0) {
      if (isPrivateIp(host)) {
        return {
          safe: false,
          reason: `Target address ${host} is a private or restricted address`,
        };
      }
      return { safe: true };
    }

    // Host is a hostname -> resolve via lookup
    try {
      const res = await lookup(host, { all: true });
      const addrs = extractAddresses(res);
      if (addrs.length === 0) {
        return {
          safe: false,
          reason: `Could not resolve hostname ${host}: no addresses returned`,
        };
      }
      for (const addr of addrs) {
        if (net.isIP(addr) === 0 || isPrivateIp(addr)) {
          return {
            safe: false,
            reason: `Target address resolves to private or restricted address: ${addr}`,
          };
        }
      }
    } catch (err) {
      return {
        safe: false,
        reason: `Could not resolve hostname ${host}: ${err.message}`,
      };
    }

    return { safe: true };
  } catch (err) {
    return {
      safe: false,
      reason: `Invalid target URL: ${err.message}`,
    };
  }
}
