import { chromium } from "playwright";
import { api, config } from "./api.mjs";
import { executeScan } from "./scan.mjs";
import { checkTargetSafety } from "./security.mjs";

const JOB_TIMEOUT_MS = 120_000;

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

async function scan(job) {
  const { scan_id: scanId, claim_token: token, target_url: targetUrl, origin } = job;

  // Run safety check before navigation / browser launch
  const safety = await checkTargetSafety(targetUrl, origin);
  if (!safety.safe) {
    log(`scan ${scanId}: safety check rejected ${targetUrl}: ${safety.reason}`);
    await api.result(scanId, token, "failed", [], safety.reason);
    return;
  }

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const result = await executeScan(browser, {
      targetUrl,
      origin,
      takeScreenshot: false,
      isDaemon: true,
      blockPrivate: true,
      onProgress: async (progress, message) => {
        await api.progress(scanId, token, progress, message);
      },
    });

    if (result.loadError) {
      await api.result(
        scanId,
        token,
        "failed",
        [],
        `Could not load the page: ${result.loadError.message}`,
      );
      return;
    }

    if (result.aborted) {
      await api.result(scanId, token, "failed", [], result.abortReason);
      return;
    }

    await api.progress(scanId, token, 90, "Sending results");
    const summary = await api.result(scanId, token, "completed", result.findings);
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
