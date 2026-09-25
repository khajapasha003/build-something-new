import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

/**
 * Pure classification function for test verdicts.
 *
 * Rules:
 * - A rejected write is SECURE only when PostgREST error code is "42501".
 * - A write that returns 2xx is judged only by the read-back with secret key:
 *     attacker value stored -> VULNERABLE; not stored -> SECURE.
 * - Every other error (any other code including PGRST204, 23502, 23503, 23505, P0001) -> INCONCLUSIVE.
 * - Positive tests: 2xx and expected read-back -> WORKS; anything else -> BROKEN.
 */
export function classify(optionsOrStatus, maybeCode, maybeOptions) {
  let isPositive = false;
  let status = null;
  let code = null;
  let attackerValueStored = null;
  let expectedValueStored = null;
  let details = "";

  if (typeof optionsOrStatus === "object" && optionsOrStatus !== null) {
    isPositive = Boolean(optionsOrStatus.isPositive);
    status = optionsOrStatus.status ?? optionsOrStatus.writeStatus ?? null;
    code = optionsOrStatus.code ?? optionsOrStatus.errorCode ?? null;
    attackerValueStored = optionsOrStatus.attackerValueStored ?? null;
    expectedValueStored = optionsOrStatus.expectedValueStored ?? null;
    details = optionsOrStatus.details ?? "";
  } else {
    status = typeof optionsOrStatus === "number" ? optionsOrStatus : null;
    if (typeof maybeCode === "boolean") {
      attackerValueStored = maybeCode;
      code = null;
    } else {
      code = typeof maybeCode === "string" ? maybeCode : (maybeCode ?? null);
    }
    const opts = typeof maybeOptions === "object" && maybeOptions !== null ? maybeOptions : {};
    if (typeof maybeOptions === "boolean") {
      attackerValueStored = maybeOptions;
    }
    isPositive = Boolean(opts.isPositive);
    if (opts.attackerValueStored !== undefined) attackerValueStored = opts.attackerValueStored;
    if (opts.expectedValueStored !== undefined) expectedValueStored = opts.expectedValueStored;
    details = opts.details ?? "";
  }

  if (status !== null) {
    status = Number(status);
  }
  if (code !== null && code !== undefined) {
    code = String(code);
  }

  const is2xx = status !== null && status >= 200 && status < 300;

  let verdict;
  let pass;
  let message;

  if (isPositive) {
    if (is2xx && expectedValueStored === true) {
      verdict = "WORKS";
      pass = true;
      message = details || `Write HTTP ${status}, expected value verified in database`;
    } else {
      verdict = "BROKEN";
      pass = false;
      message =
        details ||
        (is2xx
          ? "Write succeeded but expected value was not stored"
          : `Write failed with HTTP ${status}${code ? ` (${code})` : ""}`);
    }
  } else {
    if (is2xx) {
      if (attackerValueStored === true) {
        verdict = "VULNERABLE";
        pass = false;
        message =
          details || `Write accepted with HTTP ${status}, attacker value stored in database`;
      } else if (attackerValueStored === false) {
        verdict = "SECURE";
        pass = true;
        message = details || `Write returned HTTP ${status}, but attacker value was not stored`;
      } else {
        verdict = "INCONCLUSIVE";
        pass = false;
        message = details || `Write returned HTTP ${status}, read-back indeterminate`;
      }
    } else {
      if (code === "42501") {
        verdict = "SECURE";
        pass = true;
        message =
          details ||
          `Rejected with HTTP ${status} (code 42501: permission denied / RLS policy violation)`;
      } else {
        verdict = "INCONCLUSIVE";
        pass = false;
        message =
          details ||
          `Rejected with HTTP ${status}${code ? ` (${code})` : " (no error code)"}, expected authorization error 42501`;
      }
    }
  }

  return {
    verdict,
    pass,
    status,
    code,
    details: message,
    toString() {
      return this.verdict;
    },
    valueOf() {
      return this.verdict;
    },
    [Symbol.toPrimitive]() {
      return this.verdict;
    },
  };
}

async function parseResponse(res) {
  const status = res.status;
  let json = null;
  let text = "";
  try {
    text = await res.text();
    json = JSON.parse(text);
  } catch {
    // text remains raw
  }
  const code = json?.code || null;
  return { status, json, text, code };
}

// Entry-point execution guard: importing this module must run NO network code or exit
const isEntryPoint =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isEntryPoint) {
  // Pre-flight check: validate project host and https protocol strictly before any network calls or key checks
  const rawUrl = process.env.PLQA_SUPABASE_URL || "";
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    console.log("REFUSED: wrong project");
    process.exit(2);
  }

  if (parsedUrl.protocol !== "https:" || parsedUrl.host !== "vdhhysfvuxmqtgdtvnez.supabase.co") {
    console.log("REFUSED: wrong project");
    process.exit(2);
  }

  // Environment validation (refer to env vars by name only; never echo values)
  const anonKey = process.env.PLQA_SUPABASE_ANON_KEY;
  const secretKey = process.env.PLQA_SUPABASE_SECRET_KEY;

  if (!anonKey || !secretKey) {
    console.error("REFUSED: missing PLQA_SUPABASE_ANON_KEY or PLQA_SUPABASE_SECRET_KEY");
    process.exit(1);
  }

  function isAnonKey(key) {
    if (typeof key !== "string" || !key) return false;
    if (key.startsWith("sb_publishable_")) return true;
    try {
      const parts = key.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
        return payload.role === "anon";
      }
    } catch {}
    return false;
  }

  function isSecretKey(key) {
    if (typeof key !== "string" || !key) return false;
    if (key.startsWith("sb_secret_")) return true;
    try {
      const parts = key.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
        return payload.role === "service_role";
      }
    } catch {}
    return false;
  }

  if (!isAnonKey(anonKey) || !isSecretKey(secretKey)) {
    console.log("REFUSED: wrong key type");
    process.exit(2);
  }

  const supabaseUrl = parsedUrl.origin;

  function getAdminHeaders() {
    const headers = {
      apikey: secretKey,
      "Content-Type": "application/json",
    };
    if (!secretKey.startsWith("sb_secret_")) {
      headers["Authorization"] = `Bearer ${secretKey}`;
    }
    return headers;
  }

  function getAdminRestHeaders() {
    const headers = {
      apikey: secretKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
    if (!secretKey.startsWith("sb_secret_")) {
      headers["Authorization"] = `Bearer ${secretKey}`;
    }
    return headers;
  }

  function getUserHeaders(jwt) {
    return {
      apikey: anonKey,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
  }

  function getAnonHeaders() {
    return {
      apikey: anonKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
  }

  async function createAdminUser(email, password) {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to create admin user: HTTP ${res.status} ${text}`);
    }
    return await res.json();
  }

  async function loginUser(email, password) {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to login user: HTTP ${res.status} ${text}`);
    }
    const data = await res.json();
    return {
      id: data.user.id,
      token: data.access_token,
    };
  }

  async function deleteAdminUser(userId) {
    if (!userId) return false;
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function deleteRestRow(table, id, col = "id") {
    if (!id) return false;
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/${table}?${col}=eq.${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: getAdminRestHeaders(),
        },
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  async function run() {
    const label = process.argv[2] || "run";
    console.log(
      `Starting security verification suite (target: ${parsedUrl.host}, label: ${label})...`,
    );

    const createdAppIds = new Set();
    const createdScanIds = new Set();
    const createdWaitlistEmails = new Set();
    let userA = null;
    let userB = null;

    const results = [];

    function recordResult(
      id,
      name,
      expected,
      actual,
      status,
      details,
      httpStatus = null,
      postgrestCode = null,
      extra = {},
    ) {
      results.push({
        id,
        name,
        expected,
        actual,
        status,
        httpStatus,
        postgrestCode,
        details,
        ...extra,
      });
    }

    try {
      // Provision test users A and B
      console.log("Provisioning test users A and B...");
      const userAEmail = `plqa-test-a-${crypto.randomBytes(6).toString("hex")}@example.com`;
      const userAPassword = `A!${crypto.randomBytes(12).toString("hex")}9#`;
      const userAAdminRes = await createAdminUser(userAEmail, userAPassword);
      const userALogin = await loginUser(userAEmail, userAPassword);
      userA = { id: userAAdminRes.id || userALogin.id, token: userALogin.token };

      const userBEmail = `plqa-test-b-${crypto.randomBytes(6).toString("hex")}@example.com`;
      const userBPassword = `B!${crypto.randomBytes(12).toString("hex")}9#`;
      const userBAdminRes = await createAdminUser(userBEmail, userBPassword);
      const userBLogin = await loginUser(userBEmail, userBPassword);
      userB = { id: userBAdminRes.id || userBLogin.id, token: userBLogin.token };

      console.log("Test users provisioned successfully. Preparing test fixtures...\n");

      // Create User A verified app and queued scan (used by T7, T9, T10)
      const fixtureOrigin = `https://fixture-${crypto.randomBytes(6).toString("hex")}.example.com`;
      const fixtureAppRes = await fetch(`${supabaseUrl}/rest/v1/apps`, {
        method: "POST",
        headers: getAdminRestHeaders(),
        body: JSON.stringify({
          url: fixtureOrigin,
          origin: fixtureOrigin,
          user_id: userA.id,
          verification_status: "verified",
        }),
      });
      const fixtureAppParsed = await parseResponse(fixtureAppRes);
      const fixtureAppRow = Array.isArray(fixtureAppParsed.json)
        ? fixtureAppParsed.json[0]
        : fixtureAppParsed.json;
      if (fixtureAppRow?.id) createdAppIds.add(fixtureAppRow.id);

      const fixtureScanRes = await fetch(`${supabaseUrl}/rest/v1/scans`, {
        method: "POST",
        headers: getAdminRestHeaders(),
        body: JSON.stringify({
          app_id: fixtureAppRow.id,
          user_id: userA.id,
          target_url: `${fixtureOrigin}/`,
          status: "queued",
        }),
      });
      const fixtureScanParsed = await parseResponse(fixtureScanRes);
      const fixtureScanRow = Array.isArray(fixtureScanParsed.json)
        ? fixtureScanParsed.json[0]
        : fixtureScanParsed.json;
      if (fixtureScanRow?.id) createdScanIds.add(fixtureScanRow.id);

      // ---------------------------------------------------------
      // T1: Authenticated user A inserts an app with verification_status: 'verified'.
      // ---------------------------------------------------------
      {
        const t1Origin = `https://t1-${crypto.randomBytes(6).toString("hex")}.example.com`;
        const t1Res = await fetch(`${supabaseUrl}/rest/v1/apps`, {
          method: "POST",
          headers: getUserHeaders(userA.token),
          body: JSON.stringify({
            url: t1Origin,
            origin: t1Origin,
            user_id: userA.id,
            verification_status: "verified",
          }),
        });
        const t1Parsed = await parseResponse(t1Res);
        let t1AttackerStored = null;
        if (t1Res.ok) {
          const row = Array.isArray(t1Parsed.json) ? t1Parsed.json[0] : t1Parsed.json;
          if (row?.id) createdAppIds.add(row.id);
          const checkRes = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${row.id}`, {
            headers: getAdminRestHeaders(),
          });
          const checkParsed = await parseResponse(checkRes);
          const stored = Array.isArray(checkParsed.json) ? checkParsed.json[0] : checkParsed.json;
          t1AttackerStored = stored?.verification_status === "verified";
        }
        const verdict = classify({
          status: t1Parsed.status,
          code: t1Parsed.code,
          attackerValueStored: t1AttackerStored,
        });
        recordResult(
          "T1",
          "User A inserts app with verification_status: 'verified'",
          "SECURE",
          verdict.verdict,
          verdict.pass ? "PASS" : "FAIL",
          verdict.details,
          t1Parsed.status,
          t1Parsed.code,
        );
      }

      // ---------------------------------------------------------
      // T2: Authenticated user A inserts an app (pending), then PATCHes verification_status to 'verified'.
      // ---------------------------------------------------------
      {
        const t2Origin = `https://t2-${crypto.randomBytes(6).toString("hex")}.example.com`;
        const t2Create = await fetch(`${supabaseUrl}/rest/v1/apps`, {
          method: "POST",
          headers: getAdminRestHeaders(),
          body: JSON.stringify({
            url: t2Origin,
            origin: t2Origin,
            user_id: userA.id,
            verification_status: "pending",
          }),
        });
        const t2CreateParsed = await parseResponse(t2Create);
        const t2Row = Array.isArray(t2CreateParsed.json)
          ? t2CreateParsed.json[0]
          : t2CreateParsed.json;
        if (t2Row?.id) createdAppIds.add(t2Row.id);

        const t2Patch = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${t2Row.id}`, {
          method: "PATCH",
          headers: getUserHeaders(userA.token),
          body: JSON.stringify({
            verification_status: "verified",
          }),
        });
        const t2PatchParsed = await parseResponse(t2Patch);
        let t2AttackerStored = null;
        if (t2Patch.ok) {
          const checkRes = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${t2Row.id}`, {
            headers: getAdminRestHeaders(),
          });
          const checkParsed = await parseResponse(checkRes);
          const stored = Array.isArray(checkParsed.json) ? checkParsed.json[0] : checkParsed.json;
          t2AttackerStored = stored?.verification_status === "verified";
        }
        const verdict = classify({
          status: t2PatchParsed.status,
          code: t2PatchParsed.code,
          attackerValueStored: t2AttackerStored,
        });
        recordResult(
          "T2",
          "User A PATCHes verification_status to 'verified'",
          "SECURE",
          verdict.verdict,
          verdict.pass ? "PASS" : "FAIL",
          verdict.details,
          t2PatchParsed.status,
          t2PatchParsed.code,
        );
      }

      // ---------------------------------------------------------
      // T3: Authenticated user A PATCHes the origin of their own pending app.
      // ---------------------------------------------------------
      {
        const t3Orig = `https://t3-orig-${crypto.randomBytes(6).toString("hex")}.example.com`;
        const t3Mod = `https://t3-mod-${crypto.randomBytes(6).toString("hex")}.example.com`;
        const t3Create = await fetch(`${supabaseUrl}/rest/v1/apps`, {
          method: "POST",
          headers: getAdminRestHeaders(),
          body: JSON.stringify({
            url: t3Orig,
            origin: t3Orig,
            user_id: userA.id,
            verification_status: "pending",
          }),
        });
        const t3CreateParsed = await parseResponse(t3Create);
        const t3Row = Array.isArray(t3CreateParsed.json)
          ? t3CreateParsed.json[0]
          : t3CreateParsed.json;
        if (t3Row?.id) createdAppIds.add(t3Row.id);

        const t3Patch = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${t3Row.id}`, {
          method: "PATCH",
          headers: getUserHeaders(userA.token),
          body: JSON.stringify({
            origin: t3Mod,
          }),
        });
        const t3PatchParsed = await parseResponse(t3Patch);
        let t3AttackerStored = null;
        if (t3Patch.ok) {
          const checkRes = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${t3Row.id}`, {
            headers: getAdminRestHeaders(),
          });
          const checkParsed = await parseResponse(checkRes);
          const stored = Array.isArray(checkParsed.json) ? checkParsed.json[0] : checkParsed.json;
          t3AttackerStored = stored?.origin === t3Mod;
        }
        const verdict = classify({
          status: t3PatchParsed.status,
          code: t3PatchParsed.code,
          attackerValueStored: t3AttackerStored,
        });
        recordResult(
          "T3",
          "User A PATCHes origin of own pending app",
          "SECURE",
          verdict.verdict,
          verdict.pass ? "PASS" : "FAIL",
          verdict.details,
          t3PatchParsed.status,
          t3PatchParsed.code,
        );
      }

      // ---------------------------------------------------------
      // T4: App is marked verified (via secret key). Authenticated user A PATCHes origin to https://victim-<random>.example.
      // ---------------------------------------------------------
      {
        const t4Orig = `https://t4-legit-${crypto.randomBytes(6).toString("hex")}.example.com`;
        const t4Victim = `https://victim-${crypto.randomBytes(6).toString("hex")}.example`;
        const t4Create = await fetch(`${supabaseUrl}/rest/v1/apps`, {
          method: "POST",
          headers: getAdminRestHeaders(),
          body: JSON.stringify({
            url: t4Orig,
            origin: t4Orig,
            user_id: userA.id,
            verification_status: "verified",
          }),
        });
        const t4CreateParsed = await parseResponse(t4Create);
        const t4Row = Array.isArray(t4CreateParsed.json)
          ? t4CreateParsed.json[0]
          : t4CreateParsed.json;
        if (t4Row?.id) createdAppIds.add(t4Row.id);

        const t4Patch = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${t4Row.id}`, {
          method: "PATCH",
          headers: getUserHeaders(userA.token),
          body: JSON.stringify({
            origin: t4Victim,
          }),
        });
        const t4PatchParsed = await parseResponse(t4Patch);
        let t4AttackerStored = null;
        if (t4Patch.ok) {
          const checkRes = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${t4Row.id}`, {
            headers: getAdminRestHeaders(),
          });
          const checkParsed = await parseResponse(checkRes);
          const stored = Array.isArray(checkParsed.json) ? checkParsed.json[0] : checkParsed.json;
          t4AttackerStored = stored?.origin === t4Victim;
        }
        const verdict = classify({
          status: t4PatchParsed.status,
          code: t4PatchParsed.code,
          attackerValueStored: t4AttackerStored,
        });
        recordResult(
          "T4",
          "User A PATCHes origin of verified app to victim origin",
          "SECURE",
          verdict.verdict,
          verdict.pass ? "PASS" : "FAIL",
          verdict.details,
          t4PatchParsed.status,
          t4PatchParsed.code,
        );
      }

      // ---------------------------------------------------------
      // T5: Authenticated user A inserts a scan for their verified app, specifying target_url: http://169.254.169.254/latest/meta-data/.
      // ---------------------------------------------------------
      {
        const t5Origin = `https://t5-${crypto.randomBytes(6).toString("hex")}.example.com`;
        const t5Create = await fetch(`${supabaseUrl}/rest/v1/apps`, {
          method: "POST",
          headers: getAdminRestHeaders(),
          body: JSON.stringify({
            url: t5Origin,
            origin: t5Origin,
            user_id: userA.id,
            verification_status: "verified",
          }),
        });
        const t5CreateParsed = await parseResponse(t5Create);
        const t5AppRow = Array.isArray(t5CreateParsed.json)
          ? t5CreateParsed.json[0]
          : t5CreateParsed.json;
        if (t5AppRow?.id) createdAppIds.add(t5AppRow.id);

        const t5Scan = await fetch(`${supabaseUrl}/rest/v1/scans`, {
          method: "POST",
          headers: getUserHeaders(userA.token),
          body: JSON.stringify({
            app_id: t5AppRow.id,
            user_id: userA.id,
            target_url: "https://169.254.169.254/latest/meta-data/",
            status: "queued",
          }),
        });
        const t5ScanParsed = await parseResponse(t5Scan);
        let t5AttackerStored = null;
        if (t5Scan.ok) {
          const row = Array.isArray(t5ScanParsed.json) ? t5ScanParsed.json[0] : t5ScanParsed.json;
          if (row?.id) createdScanIds.add(row.id);
          const checkRes = await fetch(`${supabaseUrl}/rest/v1/scans?id=eq.${row.id}`, {
            headers: getAdminRestHeaders(),
          });
          const checkParsed = await parseResponse(checkRes);
          const stored = Array.isArray(checkParsed.json) ? checkParsed.json[0] : checkParsed.json;
          t5AttackerStored = stored?.target_url !== `${t5Origin}/`;
        }
        const verdict = classify({
          status: t5ScanParsed.status,
          code: t5ScanParsed.code,
          attackerValueStored: t5AttackerStored,
        });
        recordResult(
          "T5",
          "User A inserts scan with target_url: 169.254.169.254",
          "SECURE",
          verdict.verdict,
          verdict.pass ? "PASS" : "FAIL",
          verdict.details,
          t5ScanParsed.status,
          t5ScanParsed.code,
        );
      }

      // ---------------------------------------------------------
      // T6: Authenticated user A inserts a scan for their unverified app.
      // ---------------------------------------------------------
      {
        const t6Origin = `https://t6-${crypto.randomBytes(6).toString("hex")}.example.com`;
        const t6Create = await fetch(`${supabaseUrl}/rest/v1/apps`, {
          method: "POST",
          headers: getAdminRestHeaders(),
          body: JSON.stringify({
            url: t6Origin,
            origin: t6Origin,
            user_id: userA.id,
            verification_status: "pending",
          }),
        });
        const t6CreateParsed = await parseResponse(t6Create);
        const t6AppRow = Array.isArray(t6CreateParsed.json)
          ? t6CreateParsed.json[0]
          : t6CreateParsed.json;
        if (t6AppRow?.id) createdAppIds.add(t6AppRow.id);

        const t6Scan = await fetch(`${supabaseUrl}/rest/v1/scans`, {
          method: "POST",
          headers: getUserHeaders(userA.token),
          body: JSON.stringify({
            app_id: t6AppRow.id,
            user_id: userA.id,
            target_url: `${t6Origin}/`,
            status: "queued",
          }),
        });
        const t6ScanParsed = await parseResponse(t6Scan);
        let t6AttackerStored = null;
        if (t6Scan.ok) {
          const row = Array.isArray(t6ScanParsed.json) ? t6ScanParsed.json[0] : t6ScanParsed.json;
          if (row?.id) createdScanIds.add(row.id);
          t6AttackerStored = true;
        }
        const verdict = classify({
          status: t6ScanParsed.status,
          code: t6ScanParsed.code,
          attackerValueStored: t6AttackerStored,
        });
        recordResult(
          "T6",
          "User A inserts scan for unverified app",
          "SECURE",
          verdict.verdict,
          verdict.pass ? "PASS" : "FAIL",
          verdict.details,
          t6ScanParsed.status,
          t6ScanParsed.code,
        );
      }

      // ---------------------------------------------------------
      // T7: Authenticated user B selects user A's apps and scans.
      // ---------------------------------------------------------
      {
        const bAppsRes = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${fixtureAppRow.id}`, {
          headers: getUserHeaders(userB.token),
        });
        const bAppsParsed = await parseResponse(bAppsRes);
        const bAppsCount = Array.isArray(bAppsParsed.json) ? bAppsParsed.json.length : 0;

        const bScansRes = await fetch(`${supabaseUrl}/rest/v1/scans?id=eq.${fixtureScanRow.id}`, {
          headers: getUserHeaders(userB.token),
        });
        const bScansParsed = await parseResponse(bScansRes);
        const bScansCount = Array.isArray(bScansParsed.json) ? bScansParsed.json.length : 0;

        let t7Verdict;
        let t7Pass;
        let t7Details;
        let primaryStatus = bAppsParsed.status;
        let primaryCode = bAppsParsed.code || bScansParsed.code;

        if (
          bAppsCount === 0 &&
          bScansCount === 0 &&
          bAppsParsed.status < 300 &&
          bScansParsed.status < 300
        ) {
          t7Verdict = "SECURE";
          t7Pass = true;
          t7Details = "0 rows returned for User A apps and scans";
        } else if (bAppsCount > 0 || bScansCount > 0) {
          t7Verdict = "VULNERABLE";
          t7Pass = false;
          t7Details = `Returned ${bAppsCount} apps and ${bScansCount} scans`;
        } else if (bAppsParsed.code === "42501" || bScansParsed.code === "42501") {
          t7Verdict = "SECURE";
          t7Pass = true;
          t7Details = "SELECT rejected with 42501";
        } else {
          t7Verdict = "INCONCLUSIVE";
          t7Pass = false;
          t7Details = `Unexpected error: apps HTTP ${bAppsParsed.status} (${bAppsParsed.code}), scans HTTP ${bScansParsed.status} (${bScansParsed.code})`;
        }

        recordResult(
          "T7",
          "User B selects User A's apps and scans",
          "SECURE",
          t7Verdict,
          t7Pass ? "PASS" : "FAIL",
          t7Details,
          primaryStatus,
          primaryCode,
        );
      }

      // ---------------------------------------------------------
      // T8: Authenticated user A inserts a row into user_roles giving themselves role: 'admin'.
      // ---------------------------------------------------------
      {
        const t8Res = await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
          method: "POST",
          headers: getUserHeaders(userA.token),
          body: JSON.stringify({
            user_id: userA.id,
            role: "admin",
          }),
        });
        const t8Parsed = await parseResponse(t8Res);
        let t8AttackerStored = null;
        if (t8Res.ok) {
          t8AttackerStored = true;
        }
        const verdict = classify({
          status: t8Parsed.status,
          code: t8Parsed.code,
          attackerValueStored: t8AttackerStored,
        });
        recordResult(
          "T8",
          "User A inserts role: 'admin' into user_roles",
          "SECURE",
          verdict.verdict,
          verdict.pass ? "PASS" : "FAIL",
          verdict.details,
          t8Parsed.status,
          t8Parsed.code,
        );
      }

      // ---------------------------------------------------------
      // T9: Authenticated user A inserts a row into findings (using A's own T7 scan and app ids).
      // ---------------------------------------------------------
      {
        const t9Res = await fetch(`${supabaseUrl}/rest/v1/findings`, {
          method: "POST",
          headers: getUserHeaders(userA.token),
          body: JSON.stringify({
            scan_id: fixtureScanRow.id,
            app_id: fixtureAppRow.id,
            user_id: userA.id,
            rule_id: "security.test",
            severity: "bug",
            title: "Direct finding insertion test",
          }),
        });
        const t9Parsed = await parseResponse(t9Res);
        let t9AttackerStored = null;
        if (t9Res.ok) {
          t9AttackerStored = true;
        }
        const verdict = classify({
          status: t9Parsed.status,
          code: t9Parsed.code,
          attackerValueStored: t9AttackerStored,
        });
        recordResult(
          "T9",
          "User A inserts row into findings",
          "SECURE",
          verdict.verdict,
          verdict.pass ? "PASS" : "FAIL",
          verdict.details,
          t9Parsed.status,
          t9Parsed.code,
        );
      }

      // ---------------------------------------------------------
      // T10: Anon (no JWT) selects and inserts apps, scans, waitlist (with all NOT NULL columns provided).
      // ---------------------------------------------------------
      {
        const anonAppOrigin = `https://anon-${crypto.randomBytes(6).toString("hex")}.example.com`;
        const anonWaitlistEmail = `anon-${crypto.randomBytes(6).toString("hex")}@example.com`;

        const ops = [];

        // 1. SELECT apps
        const a1 = await fetch(`${supabaseUrl}/rest/v1/apps`, { headers: getAnonHeaders() });
        const a1P = await parseResponse(a1);
        const a1Count = Array.isArray(a1P.json) ? a1P.json.length : 0;
        const a1Verdict =
          (a1.ok && a1Count === 0) || a1P.code === "42501"
            ? "SECURE"
            : a1Count > 0
              ? "VULNERABLE"
              : "INCONCLUSIVE";
        ops.push({ op: "SELECT apps", status: a1P.status, code: a1P.code, verdict: a1Verdict });

        // 2. INSERT apps (NOT NULL: user_id, url, origin)
        const a2 = await fetch(`${supabaseUrl}/rest/v1/apps`, {
          method: "POST",
          headers: getAnonHeaders(),
          body: JSON.stringify({
            user_id: userA.id,
            url: anonAppOrigin,
            origin: anonAppOrigin,
          }),
        });
        const a2P = await parseResponse(a2);
        let a2AttackerStored = null;
        if (a2.ok) {
          const row = Array.isArray(a2P.json) ? a2P.json[0] : a2P.json;
          if (row?.id) createdAppIds.add(row.id);
          a2AttackerStored = true;
        }
        const a2Verdict = classify({
          status: a2P.status,
          code: a2P.code,
          attackerValueStored: a2AttackerStored,
        }).verdict;
        ops.push({ op: "INSERT apps", status: a2P.status, code: a2P.code, verdict: a2Verdict });

        // 3. SELECT scans
        const a3 = await fetch(`${supabaseUrl}/rest/v1/scans`, { headers: getAnonHeaders() });
        const a3P = await parseResponse(a3);
        const a3Count = Array.isArray(a3P.json) ? a3P.json.length : 0;
        const a3Verdict =
          (a3.ok && a3Count === 0) || a3P.code === "42501"
            ? "SECURE"
            : a3Count > 0
              ? "VULNERABLE"
              : "INCONCLUSIVE";
        ops.push({ op: "SELECT scans", status: a3P.status, code: a3P.code, verdict: a3Verdict });

        // 4. INSERT scans (NOT NULL: app_id, user_id, target_url, status)
        const a4 = await fetch(`${supabaseUrl}/rest/v1/scans`, {
          method: "POST",
          headers: getAnonHeaders(),
          body: JSON.stringify({
            app_id: fixtureAppRow.id,
            user_id: userA.id,
            target_url: `${fixtureOrigin}/`,
            status: "queued",
          }),
        });
        const a4P = await parseResponse(a4);
        let a4AttackerStored = null;
        if (a4.ok) {
          const row = Array.isArray(a4P.json) ? a4P.json[0] : a4P.json;
          if (row?.id) createdScanIds.add(row.id);
          a4AttackerStored = true;
        }
        const a4Verdict = classify({
          status: a4P.status,
          code: a4P.code,
          attackerValueStored: a4AttackerStored,
        }).verdict;
        ops.push({ op: "INSERT scans", status: a4P.status, code: a4P.code, verdict: a4Verdict });

        // 5. SELECT waitlist
        const a5 = await fetch(`${supabaseUrl}/rest/v1/waitlist`, { headers: getAnonHeaders() });
        const a5P = await parseResponse(a5);
        const a5Count = Array.isArray(a5P.json) ? a5P.json.length : 0;
        const a5Verdict =
          (a5.ok && a5Count === 0) || a5P.code === "42501"
            ? "SECURE"
            : a5Count > 0
              ? "VULNERABLE"
              : "INCONCLUSIVE";
        ops.push({ op: "SELECT waitlist", status: a5P.status, code: a5P.code, verdict: a5Verdict });

        // 6. INSERT waitlist (NOT NULL: email)
        const a6 = await fetch(`${supabaseUrl}/rest/v1/waitlist`, {
          method: "POST",
          headers: getAnonHeaders(),
          body: JSON.stringify({
            email: anonWaitlistEmail,
          }),
        });
        const a6P = await parseResponse(a6);
        let a6AttackerStored = null;
        if (a6.ok) {
          createdWaitlistEmails.add(anonWaitlistEmail);
          a6AttackerStored = true;
        }
        const a6Verdict = classify({
          status: a6P.status,
          code: a6P.code,
          attackerValueStored: a6AttackerStored,
        }).verdict;
        ops.push({ op: "INSERT waitlist", status: a6P.status, code: a6P.code, verdict: a6Verdict });

        let t10Verdict = "SECURE";
        if (ops.some((o) => o.verdict === "VULNERABLE")) {
          t10Verdict = "VULNERABLE";
        } else if (ops.some((o) => o.verdict === "INCONCLUSIVE")) {
          t10Verdict = "INCONCLUSIVE";
        }

        const t10Pass = t10Verdict === "SECURE";
        const t10Details = ops
          .map((o) => `${o.op}: HTTP ${o.status}${o.code ? ` (${o.code})` : ""} -> ${o.verdict}`)
          .join("; ");
        recordResult(
          "T10",
          "Anon selects and inserts apps, scans, waitlist",
          "SECURE",
          t10Verdict,
          t10Pass ? "PASS" : "FAIL",
          t10Details,
          a2P.status,
          a2P.code,
          { subRequests: ops },
        );
      }

      // ---------------------------------------------------------
      // P1: Secret key sets verification_status: 'verified' on an app.
      // ---------------------------------------------------------
      {
        const p1Origin = `https://p1-${crypto.randomBytes(6).toString("hex")}.example.com`;
        const p1Create = await fetch(`${supabaseUrl}/rest/v1/apps`, {
          method: "POST",
          headers: getAdminRestHeaders(),
          body: JSON.stringify({
            url: p1Origin,
            origin: p1Origin,
            user_id: userA.id,
            verification_status: "pending",
          }),
        });
        const p1CreateParsed = await parseResponse(p1Create);
        const p1Row = Array.isArray(p1CreateParsed.json)
          ? p1CreateParsed.json[0]
          : p1CreateParsed.json;
        if (p1Row?.id) createdAppIds.add(p1Row.id);

        const p1Patch = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${p1Row.id}`, {
          method: "PATCH",
          headers: getAdminRestHeaders(),
          body: JSON.stringify({
            verification_status: "verified",
          }),
        });
        const p1PatchParsed = await parseResponse(p1Patch);
        let p1ExpectedStored = false;
        if (p1Patch.ok) {
          const checkRes = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${p1Row.id}`, {
            headers: getAdminRestHeaders(),
          });
          const checkParsed = await parseResponse(checkRes);
          const stored = Array.isArray(checkParsed.json) ? checkParsed.json[0] : checkParsed.json;
          p1ExpectedStored = stored?.verification_status === "verified";
        }
        const verdict = classify({
          isPositive: true,
          status: p1PatchParsed.status,
          code: p1PatchParsed.code,
          expectedValueStored: p1ExpectedStored,
        });
        recordResult(
          "P1",
          "Secret key sets verification_status: 'verified'",
          "WORKS",
          verdict.verdict,
          verdict.pass ? "PASS" : "FAIL",
          verdict.details,
          p1PatchParsed.status,
          p1PatchParsed.code,
        );
      }

      // ---------------------------------------------------------
      // P2: Authenticated user A inserts an app with their own origin (pending).
      // ---------------------------------------------------------
      {
        const p2Origin = `https://p2-${crypto.randomBytes(6).toString("hex")}.example.com`;
        const p2Res = await fetch(`${supabaseUrl}/rest/v1/apps`, {
          method: "POST",
          headers: getUserHeaders(userA.token),
          body: JSON.stringify({
            url: p2Origin,
            origin: p2Origin,
            user_id: userA.id,
          }),
        });
        const p2Parsed = await parseResponse(p2Res);
        let p2ExpectedStored = false;
        if (p2Res.ok) {
          const row = Array.isArray(p2Parsed.json) ? p2Parsed.json[0] : p2Parsed.json;
          if (row?.id) createdAppIds.add(row.id);
          const checkRes = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${row.id}`, {
            headers: getAdminRestHeaders(),
          });
          const checkParsed = await parseResponse(checkRes);
          const stored = Array.isArray(checkParsed.json) ? checkParsed.json[0] : checkParsed.json;
          p2ExpectedStored =
            stored?.origin === p2Origin && stored?.verification_status === "pending";
        }
        const verdict = classify({
          isPositive: true,
          status: p2Parsed.status,
          code: p2Parsed.code,
          expectedValueStored: p2ExpectedStored,
        });
        recordResult(
          "P2",
          "User A inserts app with own origin (pending)",
          "WORKS",
          verdict.verdict,
          verdict.pass ? "PASS" : "FAIL",
          verdict.details,
          p2Parsed.status,
          p2Parsed.code,
        );
      }

      // ---------------------------------------------------------
      // P3: Authenticated user A queues a scan for their verified app. Stored target_url equals the app's verified origin + "/".
      // ---------------------------------------------------------
      {
        const p3Origin = `https://p3-${crypto.randomBytes(6).toString("hex")}.example.com`;
        const p3Create = await fetch(`${supabaseUrl}/rest/v1/apps`, {
          method: "POST",
          headers: getAdminRestHeaders(),
          body: JSON.stringify({
            url: p3Origin,
            origin: p3Origin,
            user_id: userA.id,
            verification_status: "verified",
          }),
        });
        const p3CreateParsed = await parseResponse(p3Create);
        const p3App = Array.isArray(p3CreateParsed.json)
          ? p3CreateParsed.json[0]
          : p3CreateParsed.json;
        if (p3App?.id) createdAppIds.add(p3App.id);

        const p3Scan = await fetch(`${supabaseUrl}/rest/v1/scans`, {
          method: "POST",
          headers: getUserHeaders(userA.token),
          body: JSON.stringify({
            app_id: p3App.id,
            user_id: userA.id,
            target_url: `${p3Origin}/`,
            status: "queued",
            progress_message: "Waiting for a worker",
          }),
        });
        const p3ScanParsed = await parseResponse(p3Scan);
        let p3ExpectedStored = false;
        if (p3Scan.ok) {
          const row = Array.isArray(p3ScanParsed.json) ? p3ScanParsed.json[0] : p3ScanParsed.json;
          if (row?.id) createdScanIds.add(row.id);
          const checkRes = await fetch(`${supabaseUrl}/rest/v1/scans?id=eq.${row.id}`, {
            headers: getAdminRestHeaders(),
          });
          const checkParsed = await parseResponse(checkRes);
          const stored = Array.isArray(checkParsed.json) ? checkParsed.json[0] : checkParsed.json;
          p3ExpectedStored = stored?.target_url === `${p3Origin}/` && stored?.status === "queued";
        }
        const verdict = classify({
          isPositive: true,
          status: p3ScanParsed.status,
          code: p3ScanParsed.code,
          expectedValueStored: p3ExpectedStored,
        });
        recordResult(
          "P3",
          "User A queues scan for verified app (target_url matches)",
          "WORKS",
          verdict.verdict,
          verdict.pass ? "PASS" : "FAIL",
          verdict.details,
          p3ScanParsed.status,
          p3ScanParsed.code,
        );
      }
    } finally {
      console.log("\n--- Cleanup ---");
      let deletedScans = 0;
      for (const scanId of createdScanIds) {
        if (await deleteRestRow("scans", scanId)) deletedScans++;
      }
      let deletedApps = 0;
      for (const appId of createdAppIds) {
        if (await deleteRestRow("apps", appId)) deletedApps++;
      }
      let deletedWaitlist = 0;
      for (const email of createdWaitlistEmails) {
        if (await deleteRestRow("waitlist", email, "email")) deletedWaitlist++;
      }
      let deletedUsers = 0;
      if (userA?.id && (await deleteAdminUser(userA.id))) deletedUsers++;
      if (userB?.id && (await deleteAdminUser(userB.id))) deletedUsers++;
      console.log(
        `Cleanup complete: removed ${deletedScans} scan(s), ${deletedApps} app(s), ${deletedWaitlist} waitlist row(s), ${deletedUsers} test user(s).`,
      );
    }

    // Display formatted results table
    console.log("\nResults Summary:");
    console.log(
      "---------------------------------------------------------------------------------------------------------------------------------------",
    );
    console.log(
      `| ${"ID".padEnd(4)} | ${"Test Name".padEnd(58)} | ${"Expected".padEnd(10)} | ${"Actual".padEnd(14)} | ${"Status".padEnd(6)} | ${"HTTP".padEnd(5)} | ${"Code".padEnd(10)} |`,
    );
    console.log(
      "---------------------------------------------------------------------------------------------------------------------------------------",
    );
    for (const r of results) {
      console.log(
        `| ${r.id.padEnd(4)} | ${r.name.padEnd(58)} | ${r.expected.padEnd(10)} | ${r.actual.padEnd(14)} | ${r.status.padEnd(6)} | ${String(r.httpStatus ?? "-").padEnd(5)} | ${String(r.postgrestCode ?? "-").padEnd(10)} |`,
      );
    }
    console.log(
      "---------------------------------------------------------------------------------------------------------------------------------------",
    );

    const total = results.length;
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = total - passed;
    console.log(`Total: ${total}, Passed: ${passed}, Failed: ${failed}\n`);

    // Write raw JSON report
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportsDir = path.resolve(process.cwd(), "../plqa-reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const reportPath = path.join(reportsDir, `m1-bypass-${label}-${timestamp}.json`);
    const reportPayload = {
      timestamp: new Date().toISOString(),
      projectHost: parsedUrl.host,
      label,
      allPassed: failed === 0,
      summary: { total, passed, failed },
      results,
    };
    fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2), "utf8");
    console.log(`Saved raw JSON results to ${reportPath}`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }

  run().catch((err) => {
    console.error(`Script error: ${err.message}`);
    process.exit(1);
  });
}
