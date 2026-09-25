import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { runChecks } from "./checks.mjs";

export const NAV_TIMEOUT_MS = 30_000;

// 1x1 transparent PNG fallback if screenshot cannot be captured from a failed page
const BLANK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/**
 * Shared scan runner for both daemon (index.mjs) and local runner (run-local.mjs).
 *
 * @param {import("playwright").Browser} browser
 * @param {object} options
 * @param {string} options.targetUrl
 * @param {string} [options.origin]
 * @param {boolean} [options.takeScreenshot=false]
 * @param {string} [options.screenshotPath]
 * @param {function} [options.onProgress]
 * @returns {Promise<{ findings: Array<object>, finalUrl: string, screenshot: { file: string, sha256: string } | null, aborted?: boolean, abortReason?: string }>}
 */
export async function executeScan(
  browser,
  {
    targetUrl,
    origin = null,
    takeScreenshot = false,
    screenshotPath = null,
    onProgress = async () => {},
  },
) {
  const consoleErrors = [];
  const failedRequests = [];

  await onProgress(10, "Opening a browser");
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: "PreLaunchQA-Worker/0.1 (+https://prelaunchqa.com)",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(NAV_TIMEOUT_MS);

  // Exact 3 listeners required by Gate G12
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({
        text: msg.text().slice(0, 300),
        location: msg.location() ?? {},
      });
    }
  });

  page.on("requestfailed", (req) => {
    failedRequests.push({
      method: req.method(),
      url: req.url().slice(0, 300),
      reason: req.failure()?.errorText ?? "unknown",
      status: null,
    });
  });

  page.on("response", (res) => {
    if (res.status() >= 400) {
      failedRequests.push({
        method: res.request().method(),
        url: res.url().slice(0, 300),
        status: res.status(),
        reason: `HTTP ${res.status()}`,
      });
    }
  });

  await onProgress(25, `Loading ${targetUrl}`);
  let response = null;
  let loadError = null;

  try {
    response = await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });
  } catch (err) {
    loadError = err;
  }

  const finalUrl = page.url() && page.url() !== "about:blank" ? page.url() : targetUrl;

  // Origin verification check for daemon mode
  if (origin && !loadError) {
    try {
      const finalOrigin = new URL(finalUrl).origin;
      if (finalOrigin !== origin) {
        await context.close();
        return {
          aborted: true,
          abortReason: `The address redirected to ${finalOrigin}, which is not the verified site`,
          findings: [],
          finalUrl,
          screenshot: null,
        };
      }
    } catch {}
  }

  if (!loadError) {
    await onProgress(55, "Waiting for the page to settle");
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  }

  // Handle screenshot if requested
  let screenshot = null;
  if (takeScreenshot && screenshotPath) {
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch {
      // If page navigation failed or screenshot threw, ensure a valid image file exists
      fs.writeFileSync(screenshotPath, BLANK_PNG);
    }
    const buf = fs.readFileSync(screenshotPath);
    const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
    screenshot = {
      file: path.basename(screenshotPath),
      sha256,
    };
  }

  await onProgress(70, "Running checks");
  const observedAt = new Date().toISOString();
  const findings = await runChecks(page, response, {
    targetUrl,
    finalUrl,
    consoleErrors,
    failedRequests,
    screenshot,
    observedAt,
  });

  await context.close();

  return {
    findings,
    finalUrl,
    screenshot,
    response,
    loadError,
  };
}
