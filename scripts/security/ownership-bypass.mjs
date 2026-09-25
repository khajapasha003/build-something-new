import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Pre-flight check: validate project host strictly before any network calls or key checks
const rawUrl = process.env.PLQA_SUPABASE_URL || '';
let parsedUrl;
try {
  parsedUrl = new URL(rawUrl);
} catch {
  console.log('REFUSED: wrong project');
  process.exit(2);
}

if (parsedUrl.host !== 'vdhhysfvuxmqtgdtvnez.supabase.co') {
  console.log('REFUSED: wrong project');
  process.exit(2);
}

// Environment validation (refer to env vars by name only; never echo values)
const anonKey = process.env.PLQA_SUPABASE_ANON_KEY;
const secretKey = process.env.PLQA_SUPABASE_SECRET_KEY;

if (!anonKey || !secretKey) {
  console.error('REFUSED: missing PLQA_SUPABASE_ANON_KEY or PLQA_SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabaseUrl = parsedUrl.origin;

function getAdminHeaders() {
  const headers = {
    'apikey': secretKey,
    'Content-Type': 'application/json',
  };
  if (!secretKey.startsWith('sb_secret_')) {
    headers['Authorization'] = `Bearer ${secretKey}`;
  }
  return headers;
}

function getAdminRestHeaders() {
  const headers = {
    'apikey': secretKey,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
  if (!secretKey.startsWith('sb_secret_')) {
    headers['Authorization'] = `Bearer ${secretKey}`;
  }
  return headers;
}

function getUserHeaders(jwt) {
  return {
    'apikey': anonKey,
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

function getAnonHeaders() {
  return {
    'apikey': anonKey,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function createAdminUser(email, password) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
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
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Content-Type': 'application/json',
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
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function deleteRestRow(table, id) {
  if (!id) return false;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
      method: 'DELETE',
      headers: getAdminRestHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function run() {
  const label = process.argv[2] || 'run';
  console.log(`Starting security verification suite (target: ${parsedUrl.host}, label: ${label})...`);

  const createdAppIds = new Set();
  const createdScanIds = new Set();
  let userA = null;
  let userB = null;

  const results = [];

  function recordResult(id, name, expected, actual, status, details) {
    results.push({ id, name, expected, actual, status, details });
  }

  try {
    // Setup test users A and B
    console.log('Provisioning test users A and B...');
    const userAEmail = `plqa-test-a-${crypto.randomBytes(6).toString('hex')}@example.com`;
    const userAPassword = `A!${crypto.randomBytes(12).toString('hex')}9#`;
    const userAAdminRes = await createAdminUser(userAEmail, userAPassword);
    const userALogin = await loginUser(userAEmail, userAPassword);
    userA = { id: userAAdminRes.id || userALogin.id, token: userALogin.token };

    const userBEmail = `plqa-test-b-${crypto.randomBytes(6).toString('hex')}@example.com`;
    const userBPassword = `B!${crypto.randomBytes(12).toString('hex')}9#`;
    const userBAdminRes = await createAdminUser(userBEmail, userBPassword);
    const userBLogin = await loginUser(userBEmail, userBPassword);
    userB = { id: userBAdminRes.id || userBLogin.id, token: userBLogin.token };

    console.log('Test users provisioned successfully. Running tests T1-T10 and P1-P3...\n');

    // ---------------------------------------------------------
    // T1: Authenticated user A inserts an app with verification_status: 'verified'.
    // ---------------------------------------------------------
    {
      const t1Origin = `https://t1-${Date.now()}.example.com`;
      const t1Res = await fetch(`${supabaseUrl}/rest/v1/apps`, {
        method: 'POST',
        headers: getUserHeaders(userA.token),
        body: JSON.stringify({
          url: t1Origin,
          origin: t1Origin,
          user_id: userA.id,
          verification_status: 'verified',
        }),
      });

      if (!t1Res.ok) {
        recordResult('T1', "User A inserts app with verification_status: 'verified'", 'SECURE', 'SECURE', 'PASS', `Rejected with HTTP ${t1Res.status}`);
      } else {
        const data = await safeJson(t1Res);
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.id) createdAppIds.add(row.id);
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${row.id}`, {
          headers: getAdminRestHeaders(),
        });
        const checkData = await safeJson(checkRes);
        const stored = Array.isArray(checkData) ? checkData[0] : checkData;
        if (!stored || stored.verification_status !== 'verified') {
          recordResult('T1', "User A inserts app with verification_status: 'verified'", 'SECURE', 'SECURE', 'PASS', `Accepted but stored status is '${stored?.verification_status}'`);
        } else {
          recordResult('T1', "User A inserts app with verification_status: 'verified'", 'SECURE', 'VULNERABLE', 'FAIL', `Stored verification_status is '${stored.verification_status}'`);
        }
      }
    }

    // ---------------------------------------------------------
    // T2: Authenticated user A inserts an app (pending), then PATCHes verification_status to 'verified'.
    // ---------------------------------------------------------
    {
      const t2Origin = `https://t2-${Date.now()}.example.com`;
      const t2Create = await fetch(`${supabaseUrl}/rest/v1/apps`, {
        method: 'POST',
        headers: getAdminRestHeaders(),
        body: JSON.stringify({
          url: t2Origin,
          origin: t2Origin,
          user_id: userA.id,
          verification_status: 'pending',
        }),
      });
      const t2Data = await safeJson(t2Create);
      const t2Row = Array.isArray(t2Data) ? t2Data[0] : t2Data;
      if (t2Row?.id) createdAppIds.add(t2Row.id);

      const t2Patch = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${t2Row.id}`, {
        method: 'PATCH',
        headers: getUserHeaders(userA.token),
        body: JSON.stringify({
          verification_status: 'verified',
        }),
      });

      if (!t2Patch.ok) {
        recordResult('T2', "User A PATCHes verification_status to 'verified'", 'SECURE', 'SECURE', 'PASS', `PATCH rejected with HTTP ${t2Patch.status}`);
      } else {
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${t2Row.id}`, {
          headers: getAdminRestHeaders(),
        });
        const checkData = await safeJson(checkRes);
        const stored = Array.isArray(checkData) ? checkData[0] : checkData;
        if (stored?.verification_status !== 'verified') {
          recordResult('T2', "User A PATCHes verification_status to 'verified'", 'SECURE', 'SECURE', 'PASS', `PATCH HTTP ${t2Patch.status} but stored status is '${stored?.verification_status}'`);
        } else {
          recordResult('T2', "User A PATCHes verification_status to 'verified'", 'SECURE', 'VULNERABLE', 'FAIL', "Stored verification_status is 'verified'");
        }
      }
    }

    // ---------------------------------------------------------
    // T3: Authenticated user A PATCHes the origin of their own pending app.
    // ---------------------------------------------------------
    {
      const t3Orig = `https://t3-orig-${Date.now()}.example.com`;
      const t3Mod = `https://t3-mod-${Date.now()}.example.com`;
      const t3Create = await fetch(`${supabaseUrl}/rest/v1/apps`, {
        method: 'POST',
        headers: getAdminRestHeaders(),
        body: JSON.stringify({
          url: t3Orig,
          origin: t3Orig,
          user_id: userA.id,
          verification_status: 'pending',
        }),
      });
      const t3Data = await safeJson(t3Create);
      const t3Row = Array.isArray(t3Data) ? t3Data[0] : t3Data;
      if (t3Row?.id) createdAppIds.add(t3Row.id);

      const t3Patch = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${t3Row.id}`, {
        method: 'PATCH',
        headers: getUserHeaders(userA.token),
        body: JSON.stringify({
          origin: t3Mod,
        }),
      });

      if (!t3Patch.ok) {
        recordResult('T3', "User A PATCHes origin of own pending app", 'SECURE', 'SECURE', 'PASS', `PATCH rejected with HTTP ${t3Patch.status}`);
      } else {
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${t3Row.id}`, {
          headers: getAdminRestHeaders(),
        });
        const checkData = await safeJson(checkRes);
        const stored = Array.isArray(checkData) ? checkData[0] : checkData;
        if (stored?.origin === t3Orig) {
          recordResult('T3', "User A PATCHes origin of own pending app", 'SECURE', 'SECURE', 'PASS', "Origin unchanged in database");
        } else {
          recordResult('T3', "User A PATCHes origin of own pending app", 'SECURE', 'VULNERABLE', 'FAIL', `Origin modified to '${stored?.origin}'`);
        }
      }
    }

    // ---------------------------------------------------------
    // T4: App is marked verified (via secret key). Authenticated user A PATCHes origin to https://victim.example.
    // ---------------------------------------------------------
    {
      const t4Orig = `https://t4-orig-${Date.now()}.example.com`;
      const t4Victim = `https://victim.example`;
      const t4Create = await fetch(`${supabaseUrl}/rest/v1/apps`, {
        method: 'POST',
        headers: getAdminRestHeaders(),
        body: JSON.stringify({
          url: t4Orig,
          origin: t4Orig,
          user_id: userA.id,
          verification_status: 'verified',
        }),
      });
      const t4Data = await safeJson(t4Create);
      const t4Row = Array.isArray(t4Data) ? t4Data[0] : t4Data;
      if (t4Row?.id) createdAppIds.add(t4Row.id);

      const t4Patch = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${t4Row.id}`, {
        method: 'PATCH',
        headers: getUserHeaders(userA.token),
        body: JSON.stringify({
          origin: t4Victim,
        }),
      });

      if (!t4Patch.ok) {
        recordResult('T4', "User A PATCHes origin of verified app to victim.example", 'SECURE', 'SECURE', 'PASS', `PATCH rejected with HTTP ${t4Patch.status}`);
      } else {
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${t4Row.id}`, {
          headers: getAdminRestHeaders(),
        });
        const checkData = await safeJson(checkRes);
        const stored = Array.isArray(checkData) ? checkData[0] : checkData;
        if (stored?.origin !== t4Victim) {
          recordResult('T4', "User A PATCHes origin of verified app to victim.example", 'SECURE', 'SECURE', 'PASS', "Origin not changed to victim.example");
        } else {
          recordResult('T4', "User A PATCHes origin of verified app to victim.example", 'SECURE', 'VULNERABLE', 'FAIL', `Origin modified to '${stored?.origin}'`);
        }
      }
    }

    // ---------------------------------------------------------
    // T5: Authenticated user A inserts a scan for their verified app, specifying target_url: http://169.254.169.254/latest/meta-data/.
    // ---------------------------------------------------------
    {
      const t5Origin = `https://t5-${Date.now()}.example.com`;
      const t5Create = await fetch(`${supabaseUrl}/rest/v1/apps`, {
        method: 'POST',
        headers: getAdminRestHeaders(),
        body: JSON.stringify({
          url: t5Origin,
          origin: t5Origin,
          user_id: userA.id,
          verification_status: 'verified',
        }),
      });
      const t5Data = await safeJson(t5Create);
      const t5AppRow = Array.isArray(t5Data) ? t5Data[0] : t5Data;
      if (t5AppRow?.id) createdAppIds.add(t5AppRow.id);

      const t5Scan = await fetch(`${supabaseUrl}/rest/v1/scans`, {
        method: 'POST',
        headers: getUserHeaders(userA.token),
        body: JSON.stringify({
          app_id: t5AppRow.id,
          user_id: userA.id,
          target_url: 'http://169.254.169.254/latest/meta-data/',
          mode: 'quick',
        }),
      });

      if (!t5Scan.ok) {
        recordResult('T5', "User A inserts scan with target_url: 169.254.169.254", 'SECURE', 'SECURE', 'PASS', `Scan insert rejected with HTTP ${t5Scan.status}`);
      } else {
        const scanData = await safeJson(t5Scan);
        const scanRow = Array.isArray(scanData) ? scanData[0] : scanData;
        if (scanRow?.id) createdScanIds.add(scanRow.id);
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/scans?id=eq.${scanRow.id}`, {
          headers: getAdminRestHeaders(),
        });
        const checkData = await safeJson(checkRes);
        const stored = Array.isArray(checkData) ? checkData[0] : checkData;
        if (stored?.target_url === `${t5Origin}/`) {
          recordResult('T5', "User A inserts scan with target_url: 169.254.169.254", 'SECURE', 'SECURE', 'PASS', `Stored target_url sanitized to '${stored.target_url}'`);
        } else {
          recordResult('T5', "User A inserts scan with target_url: 169.254.169.254", 'SECURE', 'VULNERABLE', 'FAIL', `Stored target_url is '${stored?.target_url}'`);
        }
      }
    }

    // ---------------------------------------------------------
    // T6: Authenticated user A inserts a scan for their unverified app.
    // ---------------------------------------------------------
    {
      const t6Origin = `https://t6-${Date.now()}.example.com`;
      const t6Create = await fetch(`${supabaseUrl}/rest/v1/apps`, {
        method: 'POST',
        headers: getAdminRestHeaders(),
        body: JSON.stringify({
          url: t6Origin,
          origin: t6Origin,
          user_id: userA.id,
          verification_status: 'pending',
        }),
      });
      const t6Data = await safeJson(t6Create);
      const t6AppRow = Array.isArray(t6Data) ? t6Data[0] : t6Data;
      if (t6AppRow?.id) createdAppIds.add(t6AppRow.id);

      const t6Scan = await fetch(`${supabaseUrl}/rest/v1/scans`, {
        method: 'POST',
        headers: getUserHeaders(userA.token),
        body: JSON.stringify({
          app_id: t6AppRow.id,
          user_id: userA.id,
          target_url: `${t6Origin}/`,
          mode: 'quick',
        }),
      });

      if (!t6Scan.ok) {
        recordResult('T6', "User A inserts scan for unverified app", 'SECURE', 'SECURE', 'PASS', `Scan insert rejected with HTTP ${t6Scan.status}`);
      } else {
        const scanData = await safeJson(t6Scan);
        const scanRow = Array.isArray(scanData) ? scanData[0] : scanData;
        if (scanRow?.id) createdScanIds.add(scanRow.id);
        recordResult('T6', "User A inserts scan for unverified app", 'SECURE', 'VULNERABLE', 'FAIL', `Scan accepted for unverified app with HTTP ${t6Scan.status}`);
      }
    }

    // ---------------------------------------------------------
    // T7: Authenticated user B selects user A's apps and scans.
    // ---------------------------------------------------------
    {
      const t7Origin = `https://t7-${Date.now()}.example.com`;
      const t7AppRes = await fetch(`${supabaseUrl}/rest/v1/apps`, {
        method: 'POST',
        headers: getAdminRestHeaders(),
        body: JSON.stringify({
          url: t7Origin,
          origin: t7Origin,
          user_id: userA.id,
          verification_status: 'verified',
        }),
      });
      const t7AppData = await safeJson(t7AppRes);
      const t7App = Array.isArray(t7AppData) ? t7AppData[0] : t7AppData;
      if (t7App?.id) createdAppIds.add(t7App.id);

      const t7ScanRes = await fetch(`${supabaseUrl}/rest/v1/scans`, {
        method: 'POST',
        headers: getAdminRestHeaders(),
        body: JSON.stringify({
          app_id: t7App.id,
          user_id: userA.id,
          target_url: `${t7Origin}/`,
          status: 'queued',
        }),
      });
      const t7ScanData = await safeJson(t7ScanRes);
      const t7Scan = Array.isArray(t7ScanData) ? t7ScanData[0] : t7ScanData;
      if (t7Scan?.id) createdScanIds.add(t7Scan.id);

      const bAppsRes = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${t7App.id}`, {
        headers: getUserHeaders(userB.token),
      });
      const bApps = await safeJson(bAppsRes);
      const bAppsCount = Array.isArray(bApps) ? bApps.length : 0;

      const bScansRes = await fetch(`${supabaseUrl}/rest/v1/scans?id=eq.${t7Scan.id}`, {
        headers: getUserHeaders(userB.token),
      });
      const bScans = await safeJson(bScansRes);
      const bScansCount = Array.isArray(bScans) ? bScans.length : 0;

      if (bAppsCount === 0 && bScansCount === 0) {
        recordResult('T7', "User B selects User A's apps and scans", 'SECURE', 'SECURE', 'PASS', "0 rows returned for apps and scans");
      } else {
        recordResult('T7', "User B selects User A's apps and scans", 'SECURE', 'VULNERABLE', 'FAIL', `Returned ${bAppsCount} apps and ${bScansCount} scans`);
      }
    }

    // ---------------------------------------------------------
    // T8: Authenticated user A inserts a row into user_roles giving themselves role: 'admin'.
    // ---------------------------------------------------------
    {
      const t8Res = await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
        method: 'POST',
        headers: getUserHeaders(userA.token),
        body: JSON.stringify({
          user_id: userA.id,
          role: 'admin',
        }),
      });

      if (!t8Res.ok) {
        recordResult('T8', "User A inserts role: 'admin' into user_roles", 'SECURE', 'SECURE', 'PASS', `Insert rejected with HTTP ${t8Res.status}`);
      } else {
        recordResult('T8', "User A inserts role: 'admin' into user_roles", 'SECURE', 'VULNERABLE', 'FAIL', `Insert accepted with HTTP ${t8Res.status}`);
      }
    }

    // ---------------------------------------------------------
    // T9: Authenticated user A inserts a row into findings.
    // ---------------------------------------------------------
    {
      const t9Res = await fetch(`${supabaseUrl}/rest/v1/findings`, {
        method: 'POST',
        headers: getUserHeaders(userA.token),
        body: JSON.stringify({
          scan_id: '00000000-0000-0000-0000-000000000000',
          app_id: '00000000-0000-0000-0000-000000000000',
          user_id: userA.id,
          rule_id: 'security.test',
          severity: 'bug',
          title: 'Direct finding insertion test',
        }),
      });

      if (!t9Res.ok) {
        recordResult('T9', "User A inserts row into findings", 'SECURE', 'SECURE', 'PASS', `Insert rejected with HTTP ${t9Res.status}`);
      } else {
        recordResult('T9', "User A inserts row into findings", 'SECURE', 'VULNERABLE', 'FAIL', `Insert accepted with HTTP ${t9Res.status}`);
      }
    }

    // ---------------------------------------------------------
    // T10: Anon (no JWT) selects and inserts apps, scans, waitlist.
    // ---------------------------------------------------------
    {
      const anonAppsGet = await fetch(`${supabaseUrl}/rest/v1/apps`, { headers: getAnonHeaders() });
      const anonAppsGetData = await safeJson(anonAppsGet);
      const anonAppsGetSecure = !anonAppsGet.ok || (Array.isArray(anonAppsGetData) && anonAppsGetData.length === 0);

      const anonAppsPost = await fetch(`${supabaseUrl}/rest/v1/apps`, {
        method: 'POST',
        headers: getAnonHeaders(),
        body: JSON.stringify({
          url: `https://anon-${Date.now()}.example.com`,
          origin: `https://anon-${Date.now()}.example.com`,
        }),
      });
      const anonAppsPostData = await safeJson(anonAppsPost);
      if (Array.isArray(anonAppsPostData) && anonAppsPostData[0]?.id) createdAppIds.add(anonAppsPostData[0].id);
      const anonAppsPostSecure = !anonAppsPost.ok || (Array.isArray(anonAppsPostData) && anonAppsPostData.length === 0);

      const anonScansGet = await fetch(`${supabaseUrl}/rest/v1/scans`, { headers: getAnonHeaders() });
      const anonScansGetData = await safeJson(anonScansGet);
      const anonScansGetSecure = !anonScansGet.ok || (Array.isArray(anonScansGetData) && anonScansGetData.length === 0);

      const anonScansPost = await fetch(`${supabaseUrl}/rest/v1/scans`, {
        method: 'POST',
        headers: getAnonHeaders(),
        body: JSON.stringify({
          target_url: `https://anon-${Date.now()}.example.com/`,
          mode: 'quick',
        }),
      });
      const anonScansPostData = await safeJson(anonScansPost);
      if (Array.isArray(anonScansPostData) && anonScansPostData[0]?.id) createdScanIds.add(anonScansPostData[0].id);
      const anonScansPostSecure = !anonScansPost.ok || (Array.isArray(anonScansPostData) && anonScansPostData.length === 0);

      const anonWaitlistGet = await fetch(`${supabaseUrl}/rest/v1/waitlist`, { headers: getAnonHeaders() });
      const anonWaitlistGetData = await safeJson(anonWaitlistGet);
      const anonWaitlistGetSecure = !anonWaitlistGet.ok || (Array.isArray(anonWaitlistGetData) && anonWaitlistGetData.length === 0);

      const anonWaitlistPost = await fetch(`${supabaseUrl}/rest/v1/waitlist`, {
        method: 'POST',
        headers: getAnonHeaders(),
        body: JSON.stringify({
          email: `anon-${Date.now()}@example.com`,
        }),
      });
      const anonWaitlistPostData = await safeJson(anonWaitlistPost);
      const anonWaitlistPostSecure = !anonWaitlistPost.ok || (Array.isArray(anonWaitlistPostData) && anonWaitlistPostData.length === 0);

      const allAnonSecure = anonAppsGetSecure && anonAppsPostSecure && anonScansGetSecure && anonScansPostSecure && anonWaitlistGetSecure && anonWaitlistPostSecure;
      if (allAnonSecure) {
        recordResult('T10', "Anon selects and inserts apps, scans, waitlist", 'SECURE', 'SECURE', 'PASS', "All 6 anon actions rejected or returned 0 rows");
      } else {
        recordResult('T10', "Anon selects and inserts apps, scans, waitlist", 'SECURE', 'VULNERABLE', 'FAIL', "One or more anon actions were permitted");
      }
    }

    // ---------------------------------------------------------
    // P1: Secret key sets verification_status: 'verified' on an app.
    // ---------------------------------------------------------
    {
      const p1Origin = `https://p1-${Date.now()}.example.com`;
      const p1Create = await fetch(`${supabaseUrl}/rest/v1/apps`, {
        method: 'POST',
        headers: getAdminRestHeaders(),
        body: JSON.stringify({
          url: p1Origin,
          origin: p1Origin,
          user_id: userA.id,
          verification_status: 'pending',
        }),
      });
      const p1Data = await safeJson(p1Create);
      const p1Row = Array.isArray(p1Data) ? p1Data[0] : p1Data;
      if (p1Row?.id) createdAppIds.add(p1Row.id);

      const p1Patch = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${p1Row.id}`, {
        method: 'PATCH',
        headers: getAdminRestHeaders(),
        body: JSON.stringify({
          verification_status: 'verified',
        }),
      });

      if (p1Patch.ok) {
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${p1Row.id}`, {
          headers: getAdminRestHeaders(),
        });
        const checkData = await safeJson(checkRes);
        const stored = Array.isArray(checkData) ? checkData[0] : checkData;
        if (stored?.verification_status === 'verified') {
          recordResult('P1', "Secret key sets verification_status: 'verified'", 'WORKS', 'WORKS', 'PASS', "Status verified by admin key");
        } else {
          recordResult('P1', "Secret key sets verification_status: 'verified'", 'WORKS', 'FAILED', 'FAIL', `Stored status is '${stored?.verification_status}'`);
        }
      } else {
        recordResult('P1', "Secret key sets verification_status: 'verified'", 'WORKS', 'FAILED', 'FAIL', `Admin PATCH failed with HTTP ${p1Patch.status}`);
      }
    }

    // ---------------------------------------------------------
    // P2: Authenticated user A inserts an app with their own origin (pending).
    // ---------------------------------------------------------
    {
      const p2Origin = `https://p2-${Date.now()}.example.com`;
      const p2Res = await fetch(`${supabaseUrl}/rest/v1/apps`, {
        method: 'POST',
        headers: getUserHeaders(userA.token),
        body: JSON.stringify({
          url: p2Origin,
          origin: p2Origin,
          user_id: userA.id,
        }),
      });

      if (p2Res.ok) {
        const data = await safeJson(p2Res);
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.id) createdAppIds.add(row.id);
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${row.id}`, {
          headers: getAdminRestHeaders(),
        });
        const checkData = await safeJson(checkRes);
        const stored = Array.isArray(checkData) ? checkData[0] : checkData;
        if (stored?.origin === p2Origin && stored?.verification_status === 'pending') {
          recordResult('P2', "User A inserts app with own origin (pending)", 'WORKS', 'WORKS', 'PASS', "Pending app inserted successfully");
        } else {
          recordResult('P2', "User A inserts app with own origin (pending)", 'WORKS', 'FAILED', 'FAIL', `Stored verification_status: '${stored?.verification_status}'`);
        }
      } else {
        recordResult('P2', "User A inserts app with own origin (pending)", 'WORKS', 'FAILED', 'FAIL', `Insert failed with HTTP ${p2Res.status}`);
      }
    }

    // ---------------------------------------------------------
    // P3: Authenticated user A queues a scan for their verified app. Stored target_url equals the app's verified origin + "/".
    // ---------------------------------------------------------
    {
      const p3Origin = `https://p3-${Date.now()}.example.com`;
      const p3Create = await fetch(`${supabaseUrl}/rest/v1/apps`, {
        method: 'POST',
        headers: getAdminRestHeaders(),
        body: JSON.stringify({
          url: p3Origin,
          origin: p3Origin,
          user_id: userA.id,
          verification_status: 'verified',
        }),
      });
      const p3Data = await safeJson(p3Create);
      const p3App = Array.isArray(p3Data) ? p3Data[0] : p3Data;
      if (p3App?.id) createdAppIds.add(p3App.id);

      // In Step 3, target_url is populated by trigger and omitted by client.
      // In baseline, target_url is required by NOT NULL constraint.
      let p3Scan = await fetch(`${supabaseUrl}/rest/v1/scans`, {
        method: 'POST',
        headers: getUserHeaders(userA.token),
        body: JSON.stringify({
          app_id: p3App.id,
          user_id: userA.id,
          mode: 'quick',
        }),
      });

      if (!p3Scan.ok) {
        const errText = await p3Scan.text();
        if (errText.includes('target_url') && (errText.includes('null value') || errText.includes('not-null'))) {
          p3Scan = await fetch(`${supabaseUrl}/rest/v1/scans`, {
            method: 'POST',
            headers: getUserHeaders(userA.token),
            body: JSON.stringify({
              app_id: p3App.id,
              user_id: userA.id,
              target_url: `${p3Origin}/`,
              mode: 'quick',
            }),
          });
        }
      }

      if (p3Scan.ok) {
        const scanData = await safeJson(p3Scan);
        const scanRow = Array.isArray(scanData) ? scanData[0] : scanData;
        if (scanRow?.id) createdScanIds.add(scanRow.id);
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/scans?id=eq.${scanRow.id}`, {
          headers: getAdminRestHeaders(),
        });
        const checkData = await safeJson(checkRes);
        const stored = Array.isArray(checkData) ? checkData[0] : checkData;
        if (stored?.target_url === `${p3Origin}/`) {
          recordResult('P3', "User A queues scan for verified app (target_url matches)", 'WORKS', 'WORKS', 'PASS', `Stored target_url is '${stored.target_url}'`);
        } else {
          recordResult('P3', "User A queues scan for verified app (target_url matches)", 'WORKS', 'FAILED', 'FAIL', `Stored target_url is '${stored?.target_url}'`);
        }
      } else {
        recordResult('P3', "User A queues scan for verified app (target_url matches)", 'WORKS', 'FAILED', 'FAIL', `Scan queue failed with HTTP ${p3Scan.status}`);
      }
    }

  } finally {
    console.log('\n--- Cleanup ---');
    let deletedScans = 0;
    for (const scanId of createdScanIds) {
      if (await deleteRestRow('scans', scanId)) deletedScans++;
    }
    let deletedApps = 0;
    for (const appId of createdAppIds) {
      if (await deleteRestRow('apps', appId)) deletedApps++;
    }
    let deletedUsers = 0;
    if (userA?.id && (await deleteAdminUser(userA.id))) deletedUsers++;
    if (userB?.id && (await deleteAdminUser(userB.id))) deletedUsers++;
    console.log(`Cleanup complete: removed ${deletedScans} scan(s), ${deletedApps} app(s), ${deletedUsers} test user(s).`);
  }

  // Display results table
  console.log('\nResults Summary:');
  console.log('-------------------------------------------------------------------------------------------------------------------------');
  console.log(`| ${'ID'.padEnd(4)} | ${'Test Name'.padEnd(60)} | ${'Expected'.padEnd(10)} | ${'Actual'.padEnd(12)} | ${'Status'.padEnd(6)} |`);
  console.log('-------------------------------------------------------------------------------------------------------------------------');
  for (const r of results) {
    console.log(`| ${r.id.padEnd(4)} | ${r.name.padEnd(60)} | ${r.expected.padEnd(10)} | ${r.actual.padEnd(12)} | ${r.status.padEnd(6)} |`);
  }
  console.log('-------------------------------------------------------------------------------------------------------------------------');

  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = total - passed;
  console.log(`Total: ${total}, Passed: ${passed}, Failed: ${failed}\n`);

  // Write JSON report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportsDir = path.resolve(process.cwd(), '../plqa-reports');
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
  fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2), 'utf8');
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
