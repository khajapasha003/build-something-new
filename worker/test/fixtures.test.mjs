import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startServers } from "../../fixtures/serve.mjs";
import { executeScan } from "../src/scan.mjs";
import { isPrivateIp, checkTargetSafety } from "../src/security.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const runLocalPath = path.resolve(__dirname, "../src/run-local.mjs");
const runsBaseDir = path.resolve(repoRoot, "../plqa-reports/phase-A-runs");

function runLocal(url, outDir) {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [runLocalPath, url, "--out", outDir],
      { encoding: "utf8" },
      (error, stdout, stderr) => {
        resolve({
          status: error ? (error.code ?? 1) : 0,
          stdout,
          stderr,
          error,
        });
      },
    );
  });
}

function computeSha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

describe("Phase A: Known-Answer Fixture Harness & Evidence Contract", () => {
  let servers;

  before(async () => {
    servers = await startServers();
  });

  after(async () => {
    if (servers) {
      await servers.close();
    }
  });

  test("Gate G1: Fixture V1 (all planted issues trigger)", async () => {
    const outDir = path.join(runsBaseDir, "test-v1");
    const proc = await runLocal("http://127.0.0.1:4101/", outDir);

    const findingsFile = path.join(outDir, "findings.json");
    assert.ok(fs.existsSync(findingsFile), "findings.json must be written");

    const findings = JSON.parse(fs.readFileSync(findingsFile, "utf8"));
    const nonPassed = findings.filter((f) => f.severity !== "passed");
    const nonPassedIds = nonPassed.map((f) => f.rule_id).sort();

    const expectedIds = [
      "a11y.images_without_alt",
      "a11y.missing_lang",
      "a11y.unlabelled_fields",
      "console.errors",
      "links.dead",
      "mobile.missing_viewport",
      "network.failed_requests",
      "seo.missing_description",
      "seo.missing_title",
    ].sort();

    assert.deepEqual(nonPassedIds, expectedIds, "Non-passed rule ids must match exactly");

    // Specific counts
    const imgFinding = findings.find((f) => f.rule_id === "a11y.images_without_alt");
    assert.equal(imgFinding.evidence.raw.count, 2, "images_without_alt count must be 2");

    const fieldFinding = findings.find((f) => f.rule_id === "a11y.unlabelled_fields");
    assert.equal(fieldFinding.evidence.raw.count, 1, "unlabelled_fields count must be 1");

    const linkFinding = findings.find((f) => f.rule_id === "links.dead");
    assert.equal(linkFinding.evidence.raw.count, 3, "links.dead count must be 3");

    // Network failed requests evidence check
    const netFinding = findings.find((f) => f.rule_id === "network.failed_requests");
    const netEvidenceStr = JSON.stringify(netFinding.evidence);
    assert.ok(
      netEvidenceStr.includes("127.0.0.1:4199/plqa-dead.js"),
      "network.failed_requests must contain 127.0.0.1:4199/plqa-dead.js",
    );

    // INFO check: does /plqa-missing.png (404) appear in network.failed_requests?
    const missingPngFound = netEvidenceStr.includes("/plqa-missing.png");
    console.log(
      `[INFO observation] /plqa-missing.png in network.failed_requests: ${missingPngFound}`,
    );
  });

  test("Gate G2: Fixture V2 (500 status)", async () => {
    const outDir = path.join(runsBaseDir, "test-v2");
    await runLocal("http://127.0.0.1:4101/status-500", outDir);

    const findingsFile = path.join(outDir, "findings.json");
    assert.ok(fs.existsSync(findingsFile), "findings.json must exist");
    const findings = JSON.parse(fs.readFileSync(findingsFile, "utf8"));

    const status500 = findings.find(
      (f) => f.rule_id === "http.error_status" && f.evidence?.raw?.status === 500,
    );
    assert.ok(status500, "V2 must include http.error_status with raw status 500");
  });

  test("Gate G3: Local runner exits cleanly on closed port (V3)", async () => {
    const outDir = path.join(runsBaseDir, "test-v3");
    const proc = await runLocal("http://127.0.0.1:4199/", outDir);

    assert.equal(proc.status, 0, `Process must exit with code 0, got ${proc.status}`);
    const findingsFile = path.join(outDir, "findings.json");
    assert.ok(fs.existsSync(findingsFile), "findings.json must exist");

    const findings = JSON.parse(fs.readFileSync(findingsFile, "utf8"));
    const noResp = findings.find((f) => f.rule_id === "http.no_response");
    assert.ok(noResp, "V3 findings must include http.no_response");
  });

  test("Gate G4: Fixture C1 (clean page, 0 bugs, 0 needs_review)", async () => {
    const outDir = path.join(runsBaseDir, "test-c1");
    await runLocal("http://127.0.0.1:4102/", outDir);

    const findingsFile = path.join(outDir, "findings.json");
    assert.ok(fs.existsSync(findingsFile), "findings.json must exist");
    const findings = JSON.parse(fs.readFileSync(findingsFile, "utf8"));

    const nonPassed = findings.filter((f) => f.severity !== "passed");
    assert.equal(nonPassed.length, 0, `Expected 0 non-passed findings, got ${nonPassed.length}`);
  });

  test("Gate G5: Repeatability (V1 and C1 run 3 times each)", async () => {
    const expectedV1Ids = [
      "a11y.images_without_alt",
      "a11y.missing_lang",
      "a11y.unlabelled_fields",
      "console.errors",
      "links.dead",
      "mobile.missing_viewport",
      "network.failed_requests",
      "seo.missing_description",
      "seo.missing_title",
    ].sort();

    for (let i = 1; i <= 3; i++) {
      const v1Out = path.join(runsBaseDir, `repeat-v1-run${i}`);
      const c1Out = path.join(runsBaseDir, `repeat-c1-run${i}`);

      await runLocal("http://127.0.0.1:4101/", v1Out);
      await runLocal("http://127.0.0.1:4102/", c1Out);

      const v1Findings = JSON.parse(fs.readFileSync(path.join(v1Out, "findings.json"), "utf8"));
      const c1Findings = JSON.parse(fs.readFileSync(path.join(c1Out, "findings.json"), "utf8"));

      const v1NonPassed = v1Findings
        .filter((f) => f.severity !== "passed")
        .map((f) => f.rule_id)
        .sort();
      const c1NonPassed = c1Findings
        .filter((f) => f.severity !== "passed")
        .map((f) => f.rule_id)
        .sort();

      assert.deepEqual(
        v1NonPassed,
        expectedV1Ids,
        `Run ${i}: V1 non-passed rule ids must match G1 expected array`,
      );
      assert.deepEqual(c1NonPassed, [], `Run ${i}: C1 non-passed rule ids must be []`);

      const imgFinding = v1Findings.find((f) => f.rule_id === "a11y.images_without_alt");
      assert.equal(
        imgFinding.evidence.raw.count,
        2,
        `Run ${i}: images_without_alt count must be 2`,
      );

      const fieldFinding = v1Findings.find((f) => f.rule_id === "a11y.unlabelled_fields");
      assert.equal(
        fieldFinding.evidence.raw.count,
        1,
        `Run ${i}: unlabelled_fields count must be 1`,
      );

      const linkFinding = v1Findings.find((f) => f.rule_id === "links.dead");
      assert.equal(linkFinding.evidence.raw.count, 3, `Run ${i}: links.dead count must be 3`);
    }
  });

  test("Gate G6: Contract compliance (screenshot, png width 1280, validation errors, observed_at, repro_steps, raw)", () => {
    // Check V1, V2, C1
    const runs = ["test-v1", "test-v2", "test-c1"];
    for (const d of runs) {
      const dirPath = path.join(runsBaseDir, d);
      const findings = JSON.parse(fs.readFileSync(path.join(dirPath, "findings.json"), "utf8"));
      const screenshotPath = path.join(dirPath, "screenshot.png");
      assert.ok(fs.existsSync(screenshotPath), `Screenshot must exist at ${screenshotPath}`);

      const fileBuf = fs.readFileSync(screenshotPath);
      const diskSha256 = crypto.createHash("sha256").update(fileBuf).digest("hex");
      const pngWidth = fileBuf.readUInt32BE(16);
      assert.equal(pngWidth, 1280, `${d} screenshot width must be 1280, got ${pngWidth}`);

      for (const finding of findings) {
        assert.ok(
          !finding.evidence?.validation_errors,
          `Finding ${finding.rule_id} in ${d} has validation errors: ${finding.evidence?.validation_errors}`,
        );
        assert.ok(finding.evidence?.observed_at, `Finding ${finding.rule_id} missing observed_at`);
        assert.ok(
          Array.isArray(finding.evidence?.repro_steps) && finding.evidence.repro_steps.length >= 1,
          `Finding ${finding.rule_id} must have >= 1 repro_step`,
        );
        assert.ok(
          finding.evidence?.raw && Object.keys(finding.evidence.raw).length > 0,
          `Finding ${finding.rule_id} raw must be non-empty`,
        );
        assert.equal(
          finding.evidence?.screenshot?.sha256,
          diskSha256,
          `Screenshot sha256 mismatch for ${finding.rule_id} in ${d}`,
        );
      }
    }

    // Check V3
    const v3Dir = path.join(runsBaseDir, "test-v3");
    const v3Findings = JSON.parse(fs.readFileSync(path.join(v3Dir, "findings.json"), "utf8"));
    const v3ScreenshotPath = path.join(v3Dir, "screenshot.png");
    const v3ScreenshotExists = fs.existsSync(v3ScreenshotPath);

    for (const finding of v3Findings) {
      assert.ok(
        !finding.evidence?.validation_errors,
        `V3 finding ${finding.rule_id} has validation errors: ${finding.evidence?.validation_errors}`,
      );
    }

    if (v3ScreenshotExists) {
      const v3Buf = fs.readFileSync(v3ScreenshotPath);
      const v3DiskSha = crypto.createHash("sha256").update(v3Buf).digest("hex");
      const v3Width = v3Buf.readUInt32BE(16);
      assert.equal(v3Width, 1280, "V3 screenshot width must be 1280");
      for (const finding of v3Findings) {
        assert.equal(finding.evidence?.screenshot?.sha256, v3DiskSha);
      }
      console.log(
        "[Gate G6 observation V3] Real screenshot capture observed (screenshot.png exists with width 1280 and matching sha256)",
      );
    } else {
      for (const finding of v3Findings) {
        assert.equal(
          finding.evidence?.screenshot,
          null,
          "V3 finding screenshot must be null when file does not exist",
        );
        assert.ok(
          typeof finding.evidence?.screenshot_error === "string" &&
            finding.evidence.screenshot_error.trim().length > 0,
          "V3 finding evidence.screenshot_error must be a non-empty string",
        );
      }
      console.log(
        `[Gate G6 observation V3] Screenshot failed cleanly: evidence.screenshot is null, evidence.screenshot_error is non-empty ("${v3Findings[0]?.evidence?.screenshot_error}"), and no screenshot.png exists.`,
      );
    }

    // 0 validation_errors in all runs (including repeat runs)
    for (let i = 1; i <= 3; i++) {
      for (const prefix of ["repeat-v1-run", "repeat-c1-run"]) {
        const repeatDir = path.join(runsBaseDir, `${prefix}${i}`);
        const findings = JSON.parse(fs.readFileSync(path.join(repeatDir, "findings.json"), "utf8"));
        for (const finding of findings) {
          assert.ok(
            !finding.evidence?.validation_errors,
            `Finding ${finding.rule_id} in ${prefix}${i} has validation errors: ${finding.evidence?.validation_errors}`,
          );
        }
      }
    }
  });

  test("Gate G7: Refusal pre-flight check runs before Playwright import", async () => {
    const outDir = path.join(runsBaseDir, "g7-refusal-check");
    const proc = await runLocal("https://example.com", outDir);

    assert.equal(proc.status, 2, "Exit code must be 2");
    assert.ok(
      proc.stderr.includes(
        "REFUSED: local runner only scans 127.0.0.1/localhost. Production scans go through the verified-ownership claim API.",
      ),
      `Stderr did not contain expected refusal message: ${proc.stderr}`,
    );
  });

  test("Gate G13: Daemon compatibility scan against V1", async () => {
    const browser = await chromium.launch({ args: ["--no-sandbox"] });
    try {
      const result = await executeScan(browser, {
        targetUrl: "http://127.0.0.1:4101/",
        takeScreenshot: false,
        isDaemon: true,
        blockPrivate: false,
      });

      assert.equal(result.screenshot, null, "screenshot must be null in daemon mode");
      assert.ok(result.findings.length > 0, "findings must not be empty");

      const validSeverities = new Set(["bug", "needs_review", "passed"]);
      for (const f of result.findings) {
        assert.ok(
          typeof f.rule_id === "string" && f.rule_id.length > 0,
          "rule_id must be non-empty string",
        );
        assert.ok(
          validSeverities.has(f.severity),
          `severity ${f.severity} must be in bug, needs_review, passed`,
        );
        assert.ok(
          typeof f.title === "string" && f.title.length > 0,
          "title must be non-empty string",
        );
        assert.ok(
          typeof f.page_url === "string" && f.page_url.length > 0,
          "page_url must be non-empty string",
        );
        assert.ok(
          f.evidence && typeof f.evidence === "object" && !Array.isArray(f.evidence),
          "evidence must be object",
        );
        assert.ok(
          !f.evidence.validation_errors,
          `Daemon finding ${f.rule_id} has validation errors: ${f.evidence.validation_errors}`,
        );
      }

      const jsonString = JSON.stringify(result.findings);
      const byteCount = Buffer.byteLength(jsonString, "utf8");
      console.log(`[Gate G13] Serialized findings payload: ${byteCount} bytes`);
      assert.ok(byteCount < 900000, `Payload ${byteCount} bytes must be under 900,000 bytes`);
    } finally {
      await browser.close().catch(() => {});
    }
  });

  test("Gate F2: Daemon-mode scan of http://127.0.0.1:4101/ aborts with private-address reason, 0 requests", async () => {
    let requestCount = 0;
    const countReq = () => {
      requestCount++;
    };
    servers.server4101.on("request", countReq);

    const browser = await chromium.launch({ args: ["--no-sandbox"] });
    try {
      const result = await executeScan(browser, {
        targetUrl: "http://127.0.0.1:4101/",
        origin: "http://127.0.0.1:4101",
        isDaemon: true,
        blockPrivate: true,
      });

      assert.equal(result.aborted, true, "Scan must be aborted");
      assert.match(
        result.abortReason || "",
        /private|restricted/i,
        "Abort reason must mention private address",
      );
      assert.equal(requestCount, 0, "Fixture server must receive 0 requests");
    } finally {
      servers.server4101.off("request", countReq);
      await browser.close().catch(() => {});
    }
  });

  test("Gate F3: Daemon-mode scan where target origin differs from claimed origin aborts before navigation, 0 requests", async () => {
    let requestCount = 0;
    const countReq = () => {
      requestCount++;
    };
    servers.server4101.on("request", countReq);

    const browser = await chromium.launch({ args: ["--no-sandbox"] });
    try {
      const result = await executeScan(browser, {
        targetUrl: "http://127.0.0.1:4101/",
        origin: "https://different-claimed-origin.example.com",
        isDaemon: true,
        blockPrivate: false,
      });

      assert.equal(result.aborted, true, "Scan must be aborted");
      assert.match(
        result.abortReason || "",
        /origin|verified site/i,
        "Abort reason must mention origin mismatch",
      );
      assert.equal(requestCount, 0, "Fixture server must receive 0 requests");
    } finally {
      servers.server4101.off("request", countReq);
      await browser.close().catch(() => {});
    }
  });

  test("Gate F8: Private-address helper known-answer unit test", () => {
    const privateIps = [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fe80::1",
      "fc00::1",
      "::ffff:127.0.0.1",
      "224.0.0.1",
    ];
    const publicIps = ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"];

    for (const ip of privateIps) {
      assert.equal(isPrivateIp(ip), true, `Expected ${ip} to be recognized as private`);
    }
    for (const ip of publicIps) {
      assert.equal(isPrivateIp(ip), false, `Expected ${ip} to be recognized as public`);
    }
  });

  test("Gate F12: checkTargetSafety with injected lookup", async () => {
    // 1. Injected lookup returning 93.184.216.34 -> safe: true
    const lookupPublic = async () => [{ address: "93.184.216.34", family: 4 }];
    const resPublic = await checkTargetSafety(
      "https://customer.example/",
      "https://customer.example",
      { lookup: lookupPublic },
    );
    assert.equal(resPublic.safe, true, "Public address must be safe: true");

    // 2. Injected lookup returning 10.0.0.5 -> safe: false
    const lookupPrivate10 = async () => [{ address: "10.0.0.5", family: 4 }];
    const resPrivate10 = await checkTargetSafety(
      "https://customer.example/",
      "https://customer.example",
      { lookup: lookupPrivate10 },
    );
    assert.equal(resPrivate10.safe, false, "10.0.0.5 must be safe: false");

    // 3. Injected lookup returning ::ffff:a9fe:a9fe -> safe: false
    const lookupMapped = async () => [{ address: "::ffff:a9fe:a9fe", family: 6 }];
    const resMapped = await checkTargetSafety(
      "https://customer.example/",
      "https://customer.example",
      { lookup: lookupMapped },
    );
    assert.equal(resMapped.safe, false, "::ffff:a9fe:a9fe must be safe: false");

    // 4. Injected lookup that throws -> safe: false
    const lookupThrows = async () => {
      throw new Error("DNS resolution failed ENOTFOUND");
    };
    const resThrows = await checkTargetSafety(
      "https://customer.example/",
      "https://customer.example",
      { lookup: lookupThrows },
    );
    assert.equal(resThrows.safe, false, "Lookup that throws must be safe: false");
  });

  test("Gate F13: End-to-end daemon positive path and private subresource blocking", async () => {
    const injectedLookup = async (host) => {
      if (host === "customer.test") {
        return [{ address: "93.184.216.34", family: 4 }];
      }
      if (host === "evil.test") {
        return [{ address: "10.0.0.9", family: 4 }];
      }
      return [{ address: "93.184.216.34", family: 4 }];
    };

    const browser = await chromium.launch({
      args: [
        "--no-sandbox",
        "--host-resolver-rules=MAP customer.test 127.0.0.1, MAP evil.test 127.0.0.1",
      ],
    });

    try {
      // Part a: executeScan in daemon mode (blockPrivate: true) of http://customer.test:4101/
      const resultA = await executeScan(browser, {
        targetUrl: "http://customer.test:4101/",
        origin: "http://customer.test:4101",
        isDaemon: true,
        blockPrivate: true,
        lookup: injectedLookup,
      });

      assert.equal(resultA.screenshot, null, "Screenshot must be null in daemon mode");
      assert.equal(resultA.aborted, undefined, "Scan A must not be aborted");

      const nonPassed = resultA.findings.filter((f) => f.severity !== "passed");
      const nonPassedIds = nonPassed.map((f) => f.rule_id).sort();

      const expectedIds = [
        "a11y.images_without_alt",
        "a11y.missing_lang",
        "a11y.unlabelled_fields",
        "console.errors",
        "links.dead",
        "mobile.missing_viewport",
        "network.failed_requests",
        "seo.missing_description",
        "seo.missing_title",
      ].sort();

      assert.deepEqual(nonPassedIds, expectedIds, "Non-passed rule ids must match G1 exactly");

      const imgFinding = resultA.findings.find((f) => f.rule_id === "a11y.images_without_alt");
      assert.equal(imgFinding.evidence.raw.count, 2, "images_without_alt count must be 2");

      const fieldFinding = resultA.findings.find((f) => f.rule_id === "a11y.unlabelled_fields");
      assert.equal(fieldFinding.evidence.raw.count, 1, "unlabelled_fields count must be 1");

      const linkFinding = resultA.findings.find((f) => f.rule_id === "links.dead");
      assert.equal(linkFinding.evidence.raw.count, 3, "links.dead count must be 3");

      // Part b: fixture page with-evil containing evil script
      let evilReqCount = 0;
      const countEvil = (req) => {
        if (req.url && req.url.includes("plqa-evil.js")) {
          evilReqCount++;
        }
      };
      servers.server4101.on("request", countEvil);

      try {
        await executeScan(browser, {
          targetUrl: "http://customer.test:4101/with-evil",
          origin: "http://customer.test:4101",
          isDaemon: true,
          blockPrivate: true,
          lookup: injectedLookup,
        });

        assert.equal(evilReqCount, 0, "Server must receive 0 requests for /plqa-evil.js");
      } finally {
        servers.server4101.off("request", countEvil);
      }
    } finally {
      await browser.close().catch(() => {});
    }
  });

  test("Gate F14: isPrivateIp known answers (IPv4 and IPv6 comprehensive)", () => {
    const privateIps = [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fe80::1",
      "fc00::1",
      "::ffff:127.0.0.1",
      "224.0.0.1",
      "::ffff:7f00:1",
      "::ffff:a9fe:a9fe",
      "0:0:0:0:0:0:0:1",
      "fe90::1",
      "febf::1",
      "64:ff9b::a9fe:a9fe",
      "2002:a9fe:a9fe::1",
      "2001:db8::1",
    ];
    const publicIps = [
      "8.8.8.8",
      "1.1.1.1",
      "93.184.216.34",
      "2606:4700:4700::1111",
      "2001:4860:4860::8888",
    ];

    for (const ip of privateIps) {
      assert.equal(isPrivateIp(ip), true, `Expected ${ip} to be recognized as private`);
    }
    for (const ip of publicIps) {
      assert.equal(isPrivateIp(ip), false, `Expected ${ip} to be recognized as public`);
    }
  });
});
