#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// PRE-FLIGHT HOST AND PATH CHECKS (MUST RUN BEFORE PLAYWRIGHT IMPORT)
const args = process.argv.slice(2);
let targetUrl = null;
let outDir = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") {
    outDir = args[i + 1];
    i++;
  } else if (!targetUrl && !args[i].startsWith("--")) {
    targetUrl = args[i];
  }
}

if (!targetUrl) {
  console.error("Usage: node worker/src/run-local.mjs <url> [--out <dir>]");
  process.exit(2);
}

// 1. Host validation
let parsedUrl;
try {
  parsedUrl = new URL(targetUrl);
} catch {
  console.error(`REFUSED: invalid URL ${targetUrl}`);
  process.exit(2);
}

if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
  console.error(`REFUSED: unsupported protocol ${parsedUrl.protocol}`);
  process.exit(2);
}

const allowedHosts = new Set(["127.0.0.1", "localhost"]);
if (!allowedHosts.has(parsedUrl.hostname)) {
  console.error(
    "REFUSED: local runner only scans 127.0.0.1/localhost. Production scans go through the verified-ownership claim API.",
  );
  process.exit(2);
}

// 2. Output directory validation
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const defaultOut = path.resolve(
  repoRoot,
  "../plqa-reports/phase-A-runs",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
const resolvedOut = outDir ? path.resolve(process.cwd(), outDir) : defaultOut;

const relativeToRepo = path.relative(repoRoot, resolvedOut);
const isInsideRepo = !relativeToRepo.startsWith("..") && !path.isAbsolute(relativeToRepo);

if (isInsideRepo) {
  console.error("REFUSED: --out must resolve outside the repository.");
  process.exit(2);
}

// PRE-FLIGHT PASSED: Dynamically import Playwright and runner
const { chromium } = await import("playwright");
const { executeScan } = await import("./scan.mjs");

fs.mkdirSync(resolvedOut, { recursive: true });
const screenshotPath = path.join(resolvedOut, "screenshot.png");
const findingsPath = path.join(resolvedOut, "findings.json");

console.log(`Scanning ${targetUrl}`);
console.log(`Output: ${resolvedOut}`);

const browser = await chromium.launch({ args: ["--no-sandbox"] });
try {
  const result = await executeScan(browser, {
    targetUrl,
    takeScreenshot: true,
    screenshotPath,
    onProgress: (percent, msg) => {
      console.log(`[${percent}%] ${msg}`);
    },
  });

  fs.writeFileSync(findingsPath, JSON.stringify(result.findings, null, 2), "utf8");
  console.log(`Completed: ${result.findings.length} findings written to ${findingsPath}`);
} catch (err) {
  console.error("Unhandled scan error:", err);
  process.exit(1);
} finally {
  await browser.close().catch(() => {});
}
