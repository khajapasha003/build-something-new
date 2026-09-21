import { chromium } from "playwright";
import { api, config } from "./api.mjs";
import { runChecks } from "./checks.mjs";

const NAV_TIMEOUT_MS = 30_000;
const JOB_TIMEOUT_MS = 120_000;

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

async function scan(job) {
  const { scan_id: scanId, claim_token: token, target_url: targetUrl, origin } = job;
  const consoleErrors = [];
  const failedRequests = [];

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    await api.progress(scanId, token, 10, "Opening a browser");
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: "PreLaunchQA-Worker/0.1 (+https://prelaunchqa.com)",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(NAV_TIMEOUT_MS);

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
    });
    page.on("requestfailed", (req) => {
      failedRequests.push({
        url: req.url().slice(0, 300),
        reason: req.failure()?.errorText ?? "unknown",
      });
    });
    page.on("response", (res) => {
      if (res.status() >= 400) {
        failedRequests.push({ url: res.url().slice(0, 300), reason: `HTTP ${res.status()}` });
      }
    });

    await api.progress(scanId, token, 25, `Loading ${targetUrl}`);
    let response = null;
    try {
      response = await page.goto(targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      });
    } catch (error) {
      await api.result(scanId, token, "failed", [], `Could not load the page: ${error.message}`);
      return;
    }

    // Only ever report on the site we were told to check.
    const finalOrigin = new URL(page.url()).origin;
    if (origin && finalOrigin !== origin) {
      await api.result(
        scanId,
        token,
        "failed",
        [],
        `The address redirected to ${finalOrigin}, which is not the verified site`,
      );
      return;
    }

    await api.progress(scanId, token, 55, "Waiting for the page to settle");
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    await api.progress(scanId, token, 70, "Running checks");
    const findings = await runChecks(page, response, { targetUrl, consoleErrors, failedRequests });

    await api.progress(scanId, token, 90, "Sending results");
    const summary = await api.result(scanId, token, "completed", findings);
    log(`scan ${scanId}: stored ${summary?.stored_findings ?? 0} finding(s)`);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function runJob(job) {
  log(`claimed scan ${job.scan_id} for ${job.target_url}`);
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Check took too long")), JOB_TIMEOUT_MS),
  );
  try {
    await Promise.race([scan(job), timeout]);
  } catch (error) {
    log(`scan ${job.scan_id} failed:`, error.message);
    await api
      .result(job.scan_id, job.claim_token, "failed", [], error.message.slice(0, 500))
      .catch((reportError) => log("could not report failure:", reportError.message));
  }
}

async function main() {
  log(`worker ${config.workerId()} polling ${config.apiBase()}`);
  const once = process.env.RUN_ONCE === "1";

  for (;;) {
    let job = null;
    try {
      const claimed = await api.claim();
      job = claimed?.job ?? null;
    } catch (error) {
      log("claim failed:", error.message);
    }

    if (job) {
      await runJob(job);
    } else if (once) {
      log("no job waiting");
      return;
    } else {
      await new Promise((resolve) => setTimeout(resolve, config.pollSeconds() * 1000));
    }

    if (once) return;
  }
}

main().catch((error) => {
  log("worker stopped:", error.message);
  process.exit(1);
});
