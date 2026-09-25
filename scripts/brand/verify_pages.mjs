import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

// Import Playwright from worker
const playwrightPath = path.resolve(rootDir, "worker/node_modules/playwright/index.mjs");
const { chromium } = await import(`file:///${playwrightPath.replace(/\\/g, "/")}`);

const screensDir = path.resolve("f:/PRE_LAUNCH_QA_PROJECT_21_09_26/plqa-reports/brand-screens");
if (!fs.existsSync(screensDir)) {
  fs.mkdirSync(screensDir, { recursive: true });
}

const routes = [
  { path: "/", name: "home" },
  { path: "/preorder", name: "preorder" },
  { path: "/auth", name: "auth" },
  { path: "/terms", name: "terms" },
  { path: "/privacy", name: "privacy" },
];

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();

const results = [];

for (const route of routes) {
  let logoHttpStatus = null;
  let logoUrl = null;

  // Intercept responses to track the logo image HTTP status
  const onResponse = (response) => {
    const url = response.url();
    if (url.includes("/brand/logo.jpg") || url.includes("logo.jpg")) {
      logoHttpStatus = response.status();
      logoUrl = url;
    }
  };

  page.on("response", onResponse);

  await page.goto(`http://localhost:8080${route.path}`, { waitUntil: "networkidle" });

  // Find logo element
  const logoInfo = await page.evaluate(() => {
    const img = document.querySelector('img[alt="PreLaunchQA"]') || document.querySelector('header img');
    if (!img) return null;
    return {
      src: img.getAttribute("src"),
      currentSrc: img.currentSrc,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
    };
  });

  const screenshotPath = path.join(screensDir, `${route.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  page.off("response", onResponse);

  results.push({
    route: route.path,
    screenshot: screenshotPath,
    logoSrc: logoInfo?.src ?? "NOT FOUND",
    logoHttpStatus: logoHttpStatus ?? (logoInfo?.naturalWidth > 0 ? 200 : "N/A"),
    naturalWidth: logoInfo?.naturalWidth ?? 0,
    naturalHeight: logoInfo?.naturalHeight ?? 0,
    pass: (logoHttpStatus === 200 || (logoInfo?.naturalWidth ?? 0) > 0) && (logoInfo?.naturalWidth ?? 0) > 0,
  });
}

await browser.close();

console.log("=== GATE G4 VERIFICATION RESULTS ===");
console.table(results);
const allPass = results.every((r) => r.pass);
console.log(`Summary: ${results.filter((r) => r.pass).length}/${results.length} passed.`);
console.log("All routes passed G4:", allPass);
