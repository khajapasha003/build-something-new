import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

// Import Chromium from worker/node_modules/playwright
const playwrightPath = path.resolve(rootDir, "worker/node_modules/playwright/index.mjs");
const { chromium } = await import(`file:///${playwrightPath.replace(/\\/g, "/")}`);

const logoSrcPath = path.resolve(rootDir, "brand/source/prelaunchqa-logo.jpg");
const faviconPath = path.resolve(rootDir, "public/favicon.png");
const outputDir = path.resolve(rootDir, "public/brand");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const logoBase64 = fs.readFileSync(logoSrcPath).toString("base64");
const faviconBase64 = fs.readFileSync(faviconPath).toString("base64");

// Background token: oklch(0.187 0.045 285) from src/styles.css:78
const BG_COLOR = "oklch(0.187 0.045 285)";

console.log("Launching Chromium via worker Playwright...");
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();

const reports = [];

// 1. og-image.png: 1200x630, logo scaled proportionally to 960px wide, centered
{
  const width = 1200;
  const height = 630;
  const logoWidth = 960;
  const logoHeight = Math.round(960 * (320 / 1389)); // 221 px
  await page.setViewportSize({ width, height });
  await page.setContent(`<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${width}px;
    height: ${height}px;
    background: ${BG_COLOR};
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  img {
    width: ${logoWidth}px;
    height: ${logoHeight}px;
    display: block;
  }
</style>
</head>
<body>
  <img src="data:image/jpeg;base64,${logoBase64}" />
</body>
</html>`);
  await page.waitForLoadState("networkidle");
  const dest = path.join(outputDir, "og-image.png");
  await page.screenshot({ path: dest, type: "png" });

  reports.push({
    file: "public/brand/og-image.png",
    canvasSize: `${width}x${height}`,
    logoPixelSize: `${logoWidth}x${logoHeight}`,
    source: "brand/source/prelaunchqa-logo.jpg (1389x320)",
    upscaleFactor: +(logoWidth / 1389).toFixed(3),
    status: "GENERATED",
  });
}

// 2. apple-touch-icon.png: 180x180 from favicon (96x96)
{
  const size = 180;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${size}px;
    height: ${size}px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  img {
    width: ${size}px;
    height: ${size}px;
    display: block;
  }
</style>
</head>
<body>
  <img src="data:image/png;base64,${faviconBase64}" />
</body>
</html>`);
  await page.waitForLoadState("networkidle");
  const dest = path.join(outputDir, "apple-touch-icon.png");
  await page.screenshot({ path: dest, type: "png", omitBackground: false });

  reports.push({
    file: "public/brand/apple-touch-icon.png",
    canvasSize: `${size}x${size}`,
    logoPixelSize: `${size}x${size}`,
    source: "public/favicon.png (96x96)",
    upscaleFactor: +(size / 96).toFixed(3), // 1.875x <= 2x
    status: "GENERATED",
  });
}

// 3. icon-120.png: 120x120 from favicon (96x96)
{
  const size = 120;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${size}px;
    height: ${size}px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  img {
    width: ${size}px;
    height: ${size}px;
    display: block;
  }
</style>
</head>
<body>
  <img src="data:image/png;base64,${faviconBase64}" />
</body>
</html>`);
  await page.waitForLoadState("networkidle");
  const dest = path.join(outputDir, "icon-120.png");
  await page.screenshot({ path: dest, type: "png", omitBackground: false });

  reports.push({
    file: "public/brand/icon-120.png",
    canvasSize: `${size}x${size}`,
    logoPixelSize: `${size}x${size}`,
    source: "public/favicon.png (96x96)",
    upscaleFactor: +(size / 96).toFixed(3), // 1.25x <= 2x
    status: "GENERATED",
  });
}

// 4. email-header.png: 600px wide, logo scaled to 600px wide on site background colour
{
  const width = 600;
  const height = Math.round(600 * (320 / 1389)); // 138 px
  await page.setViewportSize({ width, height });
  await page.setContent(`<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${width}px;
    height: ${height}px;
    background: ${BG_COLOR};
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  img {
    width: ${width}px;
    height: ${height}px;
    display: block;
  }
</style>
</head>
<body>
  <img src="data:image/jpeg;base64,${logoBase64}" />
</body>
</html>`);
  await page.waitForLoadState("networkidle");
  const dest = path.join(outputDir, "email-header.png");
  await page.screenshot({ path: dest, type: "png" });

  reports.push({
    file: "public/brand/email-header.png",
    canvasSize: `${width}x${height}`,
    logoPixelSize: `${width}x${height}`,
    source: "brand/source/prelaunchqa-logo.jpg (1389x320)",
    upscaleFactor: +(width / 1389).toFixed(3),
    status: "GENERATED",
  });
}

// 5. icon-512: NOT GENERATED
reports.push({
  file: "public/brand/icon-512.png",
  canvasSize: "512x512",
  logoPixelSize: "N/A",
  source: "public/favicon.png (96x96)",
  upscaleFactor: +(512 / 96).toFixed(3), // 5.333x
  status: "NOT GENERATED",
  reason: "Upscale factor 5.33x exceeds the maximum allowed 2x upscale limit",
});

await browser.close();

console.log("Size generation complete:");
console.table(reports);
