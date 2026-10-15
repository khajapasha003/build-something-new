import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let chromium = null;
try {
  ({ chromium } = await import("playwright"));
} catch {
  try {
    const workerPlaywrightPath = path.resolve(
      __dirname,
      "../worker/node_modules/playwright/index.mjs",
    );
    ({ chromium } = await import(pathToFileURL(workerPlaywrightPath).href));
  } catch {
    chromium = null;
  }
}

const baseUrl = (process.argv[2] || "https://prelaunchqa.com").replace(/\/+$/, "");

console.log(`\n======================================================`);
console.log(`PreLaunchQA End-to-End Automated Audit Suite`);
console.log(`Target Base URL: ${baseUrl}`);
console.log(`Execution Mode:  ${chromium ? "Playwright Headless Chromium" : "HTTP DOM & API Auditor"}`);
console.log(`======================================================\n`);

let passedCount = 0;
let failedCount = 0;

function assertCheck(name, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${name} ${detail ? `(${detail})` : ""}`);
    failedCount++;
  }
}

if (chromium) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    // TEST 1: Homepage
    console.log(`[Test 1] Playwright Auditing Homepage: ${baseUrl}/`);
    try {
      const homeRes = await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 15000 });
      assertCheck("Homepage returns HTTP 200", homeRes ? homeRes.status() === 200 : false);

      await page.waitForSelector("text=PreLaunch", { timeout: 5000 }).catch(() => {});
      const logoText = await page.locator("text=PreLaunch").first().isVisible().catch(() => false);
      assertCheck("PreLaunch wordmark is visible", logoText);

      const qaBadge = await page.locator("text=QA").first().isVisible().catch(() => false);
      assertCheck("QA pill badge is visible", qaBadge);

      const demoVideo = await page.locator("video, #demo").count();
      assertCheck("Old demo video is removed from DOM", demoVideo === 0);
    } catch (err) {
      assertCheck("Homepage load succeeded without timeout", false, err.message);
    }

    // TEST 2: Auth Page
    console.log(`\n[Test 2] Playwright Auditing Auth Page: ${baseUrl}/auth`);
    try {
      const authRes = await page.goto(`${baseUrl}/auth`, { waitUntil: "domcontentloaded", timeout: 15000 });
      assertCheck("Auth page returns HTTP 200", authRes ? authRes.status() === 200 : false);

      await page.waitForTimeout(1000);
      const hasCrash = await page.locator("text=This page didn't load").count();
      assertCheck("Auth page does NOT crash into error boundary", hasCrash === 0);
    } catch (err) {
      assertCheck("Auth page load succeeded without timeout", false, err.message);
    }

    // TEST 3: Preorder Page
    console.log(`\n[Test 3] Playwright Auditing Preorder Page: ${baseUrl}/preorder`);
    try {
      const preorderRes = await page.goto(`${baseUrl}/preorder`, { waitUntil: "domcontentloaded", timeout: 15000 });
      assertCheck("Preorder page returns HTTP 200", preorderRes ? preorderRes.status() === 200 : false);

      await page.waitForSelector("text=Launch Check", { timeout: 5000 }).catch(() => {});
      const launchPack = await page.locator("text=Launch Check").first().isVisible().catch(() => false);
      assertCheck("Launch Check tier ($49) displayed", launchPack);
    } catch (err) {
      assertCheck("Preorder page load succeeded without timeout", false, err.message);
    }
  } finally {
    await browser.close().catch(() => {});
  }
} else {
  // HTTP DOM Auditor Mode (When running outside Lightsail without Playwright binary)
  console.log(`[Test 1] Auditing Homepage: ${baseUrl}/`);
  const homeRes = await fetch(`${baseUrl}/`);
  assertCheck("Homepage returns HTTP 200", homeRes.status === 200, `Got ${homeRes.status}`);
  const homeHtml = await homeRes.text();

  assertCheck("PreLaunch wordmark is present", homeHtml.includes("PreLaunch"));
  assertCheck("QA brand badge is present", homeHtml.includes("QA"));
  assertCheck("Old demo video (#demo) is removed", !homeHtml.includes('id="demo"') && !homeHtml.includes("prelaunchqa-demo.mp4"));
  assertCheck("Client deliverables showcase is present", homeHtml.includes("Raw Evidence") || homeHtml.includes("Evidence"));

  console.log(`\n[Test 2] Auditing Auth Page: ${baseUrl}/auth`);
  const authRes = await fetch(`${baseUrl}/auth`);
  assertCheck("Auth page returns HTTP 200", authRes.status === 200, `Got ${authRes.status}`);
  const authHtml = await authRes.text();
  assertCheck("Auth page does not render error boundary crash", !authHtml.includes("This page didn't load"));

  console.log(`\n[Test 3] Auditing Preorder / Pricing Page: ${baseUrl}/preorder`);
  const preRes = await fetch(`${baseUrl}/preorder`);
  assertCheck("Preorder page returns HTTP 200", preRes.status === 200);
  const preHtml = await preRes.text();
  assertCheck("Pricing tiers present ($49 Launch Check)", preHtml.includes("$49") || preHtml.includes("Launch Check"));
  assertCheck("Multi-gateway payment support present", preHtml.includes("PayPal") || preHtml.includes("Stripe"));

  console.log(`\n[Test 4] Auditing Guides Page: ${baseUrl}/guides`);
  const guidesRes = await fetch(`${baseUrl}/guides`);
  assertCheck("Guides page returns HTTP 200", guidesRes.status === 200);
  const guidesHtml = await guidesRes.text();
  assertCheck("AI platform guides rendered", guidesHtml.includes("Lovable") || guidesHtml.includes("Bolt"));
}

// TEST 5: API Endpoints (Version & Badge)
console.log(`\n[Test 5] Auditing Production APIs`);
const verRes = await fetch(`${baseUrl}/api/public/version`);
const verData = await verRes.json().catch(() => ({}));
assertCheck("GET /api/public/version returns HTTP 200", verRes.status === 200);
assertCheck("Version reports env_ok: true", verData.env_ok === true);
assertCheck("Version reports valid 40-char commit SHA", /^[0-9a-f]{40}$/i.test(verData.commit));

const badgeRes = await fetch(`${baseUrl}/api/public/badge?scanId=00000000-0000-0000-0000-000000000000`);
assertCheck("GET /api/public/badge returns HTTP 200 SVG", badgeRes.status === 200 && badgeRes.headers.get("content-type")?.includes("svg"));

console.log(`\n------------------------------------------------------`);
console.log(`Results: ${passedCount} Passed, ${failedCount} Failed`);
console.log(`------------------------------------------------------\n`);

if (failedCount > 0) {
  process.exit(1);
}
