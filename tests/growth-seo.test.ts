import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { BILLING_PLANS } from "../src/lib/billing.constants.ts";

test("SEO: public/sitemap.xml exists and contains valid URLs", () => {
  const sitemapPath = path.resolve(process.cwd(), "public/sitemap.xml");
  assert.strictEqual(fs.existsSync(sitemapPath), true, "sitemap.xml should exist in public/");

  const content = fs.readFileSync(sitemapPath, "utf-8");
  assert.strictEqual(content.includes("<urlset"), true);
  assert.strictEqual(content.includes("https://prelaunchqa.com/"), true);
  assert.strictEqual(content.includes("https://prelaunchqa.com/guides"), true);
  assert.strictEqual(content.includes("https://prelaunchqa.com/preorder"), true);
  assert.strictEqual(content.includes("https://prelaunchqa.com/auth"), true);
  assert.strictEqual(content.includes("https://prelaunchqa.com/support"), true);
  assert.strictEqual(content.includes("https://prelaunchqa.com/status"), true);
});

test("SEO: public/robots.txt allows search & AI crawlers and specifies sitemap", () => {
  const robotsPath = path.resolve(process.cwd(), "public/robots.txt");
  assert.strictEqual(fs.existsSync(robotsPath), true, "robots.txt should exist in public/");

  const content = fs.readFileSync(robotsPath, "utf-8");
  assert.strictEqual(content.includes("Sitemap: https://prelaunchqa.com/sitemap.xml"), true);
  assert.strictEqual(content.includes("GPTBot"), true);
  assert.strictEqual(content.includes("PerplexityBot"), true);
  assert.strictEqual(content.includes("ClaudeBot"), true);
  assert.strictEqual(content.includes("Allow: /"), true);
});

test("Growth: billing plans provide free sample tier and upgrade tiers", () => {
  assert.strictEqual(BILLING_PLANS.sample.scanCredits, 1);
  assert.strictEqual(BILLING_PLANS.launch.scanCredits, 5);
  assert.strictEqual(BILLING_PLANS.retest.scanCredits, -1);
  assert.strictEqual(BILLING_PLANS.retest.type, "subscription");
});
