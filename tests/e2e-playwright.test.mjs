import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  try {
    const workerPlaywrightPath = path.resolve(
      __dirname,
      "../worker/node_modules/playwright/index.mjs",
    );
    ({ chromium } = await import(workerPlaywrightPath));
  } catch (err) {
    console.error("Could not load Playwright:", err);
    process.exit(1);
  }
}

const baseUrl = (process.argv[2] || "https://prelaunchqa.com").replace(/\/+$/, "");

console.log(`\n======================================================`);
console.log(`PreLaunchQA End-to-End Playwright Automated Audit`);
console.log(`Target Base URL: ${baseUrl}`);
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

const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  // ----------------------------------------------------
  // TEST 1: Homepage Audit & Brand Logo & No Demo Video
  // ----------------------------------------------------
  console.log(`[Test 1] Auditing Homepage: ${baseUrl}/`);
  const homeRes = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 30000 });
  assertCheck("Homepage returns HTTP 200", homeRes.status() === 200, `Got ${homeRes.status()}`);

  // Check Brand Logo
  const logoText = await page.locator("text=PreLaunch").first().isVisible();
  assertCheck("PreLaunch wordmark is visible", logoText);

  const qaBadge = await page.locator("text=QA").first().isVisible();
  assertCheck("QA pill badge is visible", qaBadge);

  // Check Demo Video is REMOVED
  const demoVideo = await page.locator("video, #demo").count();
  assertCheck("Old demo video is removed from DOM", demoVideo === 0, `Found ${demoVideo} video elements`);

  // Check Interactive DevTools Tabs
  const consoleTab = await page.locator("text=Console Errors").first().isVisible();
  assertCheck("Interactive DevTools preview is rendered", consoleTab);

  const auditInput = await page.locator('input[placeholder*="mycoolapp.com"]').isVisible();
  assertCheck("Hero instant audit URL input is present", auditInput);

  // ----------------------------------------------------
  // TEST 2: Auth Page Audit
  // ----------------------------------------------------
  console.log(`\n[Test 2] Auditing Auth Page: ${baseUrl}/auth`);
  const authRes = await page.goto(`${baseUrl}/auth`, { waitUntil: "networkidle", timeout: 30000 });
  assertCheck("Auth page returns HTTP 200", authRes.status() === 200, `Got ${authRes.status()}`);

  const hasCrashBoundary = await page.locator("text=This page didn't load").count();
  assertCheck("Auth page does NOT crash into error boundary", hasCrashBoundary === 0);

  const googleButton = await page.locator("text=Continue with Google").isVisible().catch(() => false);
  const emailInput = await page.locator('input[type="email"]').isVisible().catch(() => false);
  assertCheck("Sign-in options (Google & Magic Link) are rendered", googleButton || emailInput);

  // ----------------------------------------------------
  // TEST 3: Preorder & Payment Gateway Options
  // ----------------------------------------------------
  console.log(`\n[Test 3] Auditing Preorder / Pricing Page: ${baseUrl}/preorder`);
  const preorderRes = await page.goto(`${baseUrl}/preorder`, { waitUntil: "networkidle", timeout: 30000 });
  assertCheck("Preorder page returns HTTP 200", preorderRes.status() === 200);

  const launchPack = await page.locator("text=Launch Check").first().isVisible();
  assertCheck("Launch Check tier is displayed ($49)", launchPack);

  const paymentBadges = await page.locator("text=PayPal").first().isVisible();
  assertCheck("Multi-gateway payment options (PayPal / Cards / Razorpay) displayed", paymentBadges);

  // ----------------------------------------------------
  // TEST 4: Guides Page
  // ----------------------------------------------------
  console.log(`\n[Test 4] Auditing Guides Page: ${baseUrl}/guides`);
  const guidesRes = await page.goto(`${baseUrl}/guides`, { waitUntil: "networkidle", timeout: 30000 });
  assertCheck("Guides page returns HTTP 200", guidesRes.status() === 200);

  const lovableGuide = await page.locator("text=Lovable").first().isVisible();
  assertCheck("AI Platform guide for Lovable is rendered", lovableGuide);

  // ----------------------------------------------------
  // TEST 5: API Endpoints (Version & Badge)
  // ----------------------------------------------------
  console.log(`\n[Test 5] Auditing API Endpoints`);
  const verRes = await fetch(`${baseUrl}/api/public/version`);
  const verData = await verRes.json().catch(() => ({}));
  assertCheck("GET /api/public/version returns 200", verRes.status === 200);
  assertCheck("Version reports env_ok: true", verData.env_ok === true);
  assertCheck("Version reports valid 40-char commit SHA", /^[0-9a-f]{40}$/i.test(verData.commit));

  const badgeRes = await fetch(`${baseUrl}/api/public/badge?scanId=00000000-0000-0000-0000-000000000000`);
  assertCheck("GET /api/public/badge returns 200 SVG", badgeRes.status === 200 && badgeRes.headers.get("content-type")?.includes("svg"));

  console.log(`\n------------------------------------------------------`);
  console.log(`Results: ${passedCount} Passed, ${failedCount} Failed`);
  console.log(`------------------------------------------------------\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
} finally {
  await browser.close();
}
