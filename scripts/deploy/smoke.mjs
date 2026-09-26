import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve Playwright from worker/node_modules/playwright or direct dependency
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  try {
    const workerPlaywrightPath = path.resolve(
      __dirname,
      "../../worker/node_modules/playwright/index.mjs",
    );
    ({ chromium } = await import(pathToFileURL(workerPlaywrightPath).href));
  } catch (err) {
    console.error("Failed to load Playwright:", err);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error(
    "Usage: node scripts/deploy/smoke.mjs <baseUrl> <expectedCommit> <expectEnvOk:true|false>",
  );
  process.exit(1);
}

const rawBaseUrl = args[0];
const expectedCommit = args[1].trim();
const rawExpectEnvOk = args[2].trim().toLowerCase();

if (!/^https?:\/\//i.test(rawBaseUrl)) {
  console.error(`Invalid baseUrl: "${rawBaseUrl}"`);
  process.exit(1);
}

if (!/^[0-9a-f]{40}$/i.test(expectedCommit)) {
  console.error(`Invalid expectedCommit (must be 40 hex chars): "${expectedCommit}"`);
  process.exit(1);
}

if (rawExpectEnvOk !== "true" && rawExpectEnvOk !== "false") {
  console.error(`Invalid expectEnvOk: "${rawExpectEnvOk}" (must be "true" or "false")`);
  process.exit(1);
}

const baseUrl = rawBaseUrl.replace(/\/+$/, "");
const expectedEnvOk = rawExpectEnvOk === "true";

console.log(`[smoke] Starting smoke test against ${baseUrl}`);
console.log(`[smoke] Expected commit: ${expectedCommit}`);
console.log(`[smoke] Expected env_ok: ${expectedEnvOk}`);

let failed = false;

// 1. Verify GET /api/public/version
try {
  const versionUrl = `${baseUrl}/api/public/version`;
  console.log(`[smoke] Checking GET ${versionUrl}...`);
  const res = await fetch(versionUrl);

  if (res.status !== 200) {
    console.error(`[smoke] FAIL: /api/public/version returned HTTP ${res.status} (expected 200)`);
    failed = true;
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    console.error(`[smoke] FAIL: /api/public/version returned content-type "${contentType}"`);
    failed = true;
  }

  const rawText = await res.text();
  let body;
  try {
    body = JSON.parse(rawText);
  } catch (e) {
    console.error(`[smoke] FAIL: /api/public/version returned invalid JSON: ${rawText}`);
    failed = true;
  }

  if (body) {
    console.log(`[smoke] Version response:`, JSON.stringify(body));

    if (body.commit !== expectedCommit) {
      console.error(
        `[smoke] FAIL: commit mismatch: got "${body.commit}", expected "${expectedCommit}"`,
      );
      failed = true;
    } else {
      console.log(`[smoke] PASS: commit matches expected HEAD (${body.commit})`);
    }

    if (!body.built_at || isNaN(Date.parse(body.built_at))) {
      console.error(`[smoke] FAIL: built_at is not a valid ISO date string: "${body.built_at}"`);
      failed = true;
    } else {
      console.log(`[smoke] PASS: built_at is valid ISO date (${body.built_at})`);
    }

    if (body.env_ok !== expectedEnvOk) {
      console.error(`[smoke] FAIL: env_ok mismatch: got ${body.env_ok}, expected ${expectedEnvOk}`);
      failed = true;
    } else {
      console.log(`[smoke] PASS: env_ok matches expected (${body.env_ok})`);
    }

    // Ensure no secret names or values leaked
    const disallowedTerms = ["SUPABASE", "sb_publishable_", "sb_secret_", "KEY", "SECRET"];
    for (const term of disallowedTerms) {
      if (rawText.includes(term)) {
        console.error(
          `[smoke] FAIL: /api/public/version response contains disallowed term "${term}"`,
        );
        failed = true;
      }
    }
  }
} catch (err) {
  console.error(`[smoke] FAIL: could not fetch /api/public/version:`, err);
  failed = true;
}

if (failed) {
  console.error("[smoke] Version endpoint check failed. Aborting smoke test.");
  process.exit(1);
}

// 2. Playwright Page Audits
const PAGES = ["/", "/preorder", "/auth", "/terms", "/privacy"];

const browser = await chromium.launch({ headless: true });

try {
  for (const pagePath of PAGES) {
    console.log(`\n[smoke] Auditing page: ${pagePath}`);
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    const distinctHosts = new Set();
    const consoleErrors = [];
    let logoResponseStatus = null;

    page.on("request", (req) => {
      try {
        const u = new URL(req.url());
        distinctHosts.add(u.host);
      } catch {}
    });

    page.on("response", (resp) => {
      const url = resp.url();
      if (url.includes("/brand/logo.jpg") || url.includes("logo")) {
        logoResponseStatus = resp.status();
      }
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    const targetUrl = `${baseUrl}${pagePath}`;
    const pageResponse = await page.goto(targetUrl, { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("load");

    const httpStatus = pageResponse ? pageResponse.status() : null;
    console.log(`[smoke] ${pagePath} - HTTP status: ${httpStatus}`);

    if (httpStatus !== 200) {
      console.error(`[smoke] FAIL: ${pagePath} returned HTTP ${httpStatus} (expected 200)`);
      failed = true;
    }

    // Wait for logo element to attach and check naturalWidth
    const logoLocator = page
      .locator('img[src*="/brand/logo.jpg"], img[alt*="PreLaunchQA"]')
      .first();
    await logoLocator.waitFor({ state: "attached", timeout: 10000 }).catch(() => {});

    let naturalWidth = 0;
    try {
      naturalWidth = await logoLocator.evaluate((el) => el.naturalWidth);
    } catch {}

    if (logoResponseStatus === null) {
      try {
        const logoFetch = await fetch(`${baseUrl}/brand/logo.jpg`);
        logoResponseStatus = logoFetch.status;
      } catch {}
    }

    console.log(
      `[smoke] ${pagePath} - Logo response status: ${logoResponseStatus}, naturalWidth: ${naturalWidth}`,
    );

    if (logoResponseStatus !== 200) {
      console.error(
        `[smoke] FAIL: ${pagePath} logo response status is ${logoResponseStatus} (expected 200)`,
      );
      failed = true;
    }

    if (naturalWidth <= 0) {
      console.error(
        `[smoke] FAIL: ${pagePath} logo naturalWidth is ${naturalWidth} (expected > 0)`,
      );
      failed = true;
    }

    // Assert no host contains "lovable"
    console.log(
      `[smoke] ${pagePath} - Distinct hosts:`,
      Array.from(distinctHosts).sort().join(", "),
    );
    for (const host of distinctHosts) {
      if (host.toLowerCase().includes("lovable")) {
        console.error(`[smoke] FAIL: ${pagePath} made request to disallowed host "${host}"`);
        failed = true;
      }
    }

    if (consoleErrors.length > 0) {
      console.warn(
        `[smoke] ${pagePath} - Console errors (${consoleErrors.length}):`,
        consoleErrors,
      );
    } else {
      console.log(`[smoke] ${pagePath} - Console errors: 0`);
    }

    await context.close();
  }
} catch (err) {
  console.error("[smoke] Exception during browser page audit:", err);
  failed = true;
} finally {
  await browser.close();
}

if (failed) {
  console.error("\n[smoke] SMOKE TEST FAILED.");
  process.exit(1);
} else {
  console.log("\n[smoke] ALL SMOKE CHECKS PASSED.");
  process.exit(0);
}
