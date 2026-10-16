import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { SignupForm } from "@/components/SignupForm";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PreLaunchQA — Automated Real-Browser QA for AI-Built Apps" },
      {
        name: "description",
        content:
          "PreLaunchQA loads your AI-generated web app in a real Chromium browser and returns console errors, failed network requests, broken links, and accessibility gaps with raw evidence.",
      },
      { property: "og:title", content: "PreLaunchQA — Real Browser Checks. Launch with Proof." },
      {
        property: "og:description",
        content:
          "Automated browser checks for AI-built web apps: console errors, failed network calls, dead links, and raw evidence for every finding.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

const currentlyChecked = [
  "Page HTTP response status (200, 4xx, 5xx, or unreachable)",
  "Browser console errors logged during page load",
  "Failed network requests and resource calls",
  "Page title & mobile viewport meta tags",
  "Search description & OpenGraph metadata",
  "HTML language attribute (html lang)",
  "Images without alternative text (accessibility)",
  "Form fields without labels & unlinked inputs",
  "Insecure mixed content (http:// on https://)",
  "Dead links (empty, '#', or javascript:void)",
];

const comingNext = [
  "Multi-page crawling across internal routes",
  "Interactive flows in real browser: signup, login, password reset, and main forms",
  "Test-mode checkout walkthroughs & Stripe elements validation",
  "Visual evidence bundle: screenshots, video recordings, and Playwright traces",
  "Downloadable reproduction scripts & AI fix prompts per finding",
  "Responsive dual-breakpoint checks (1440px and 390px) with horizontal overflow detection",
  "Passive secret pattern scanning in public bundles & security headers inspection",
];

const excluded = [
  "Native mobile apps and desktop apps",
  "Active attacks: SQL injection, brute force, fuzzing, denial of service",
  "Real payments or changes to your production data — test mode only",
  '"Certified" or "bug-free" badges — we report evidence, not guarantees',
  "Auto-fixing your code or modifying your repository",
  "Scanning any site without verified owner permission",
];

const steps = [
  {
    step: "01",
    title: "Verify you own the app",
    body: "Add a 1-line Meta tag, DNS TXT record, or verification file. Nothing is ever checked until ownership checks out.",
  },
  {
    step: "02",
    title: "Headless Chromium audits the page",
    body: "A real Chromium browser loads your app, executes JavaScript, navigates DOM elements, and intercepts network calls.",
  },
  {
    step: "03",
    title: "You get indisputable evidence",
    body: "Every bug carries raw browser console traces and request dumps. Verify for yourself and feed direct fix prompts to your AI builder.",
  },
];

function InteractiveDevToolsPreview() {
  const [activeTab, setActiveTab] = useState<"console" | "network" | "dom" | "json">("console");

  return (
    <div className="relative mx-auto mt-12 max-w-5xl overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-950/90 shadow-2xl shadow-violet-500/10 backdrop-blur-xl">
      {/* Mock Browser Title Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-rose-500/80" />
          <span className="size-3 rounded-full bg-amber-500/80" />
          <span className="size-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 font-mono text-xs text-slate-400">Chromium Headless · Session #8491</span>
        </div>

        {/* Mock Address Bar */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1 font-mono text-xs text-slate-300">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>https://yourapp.com</span>
          <span className="rounded bg-emerald-400/20 px-1 py-0.2 text-[10px] font-bold text-emerald-300">200 OK</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="font-mono">1440 × 900</span>
          <span>·</span>
          <span className="text-emerald-400 font-semibold">Ready for Launch</span>
        </div>
      </div>

      {/* DevTools Tab Bar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-800/80 bg-slate-900/40 px-4 pt-2">
        <button
          type="button"
          onClick={() => setActiveTab("console")}
          className={`flex items-center gap-2 rounded-t-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "console"
              ? "border-t-2 border-primary bg-slate-950 text-foreground"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="size-2 rounded-full bg-rose-500" />
          <span>Console Errors</span>
          <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-bold text-rose-300">1</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("network")}
          className={`flex items-center gap-2 rounded-t-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "network"
              ? "border-t-2 border-amber bg-slate-950 text-foreground"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="size-2 rounded-full bg-amber" />
          <span>Network Failures</span>
          <span className="rounded-full bg-amber/20 px-1.5 py-0.2 text-[10px] font-bold text-amber">1</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dom")}
          className={`flex items-center gap-2 rounded-t-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "dom"
              ? "border-t-2 border-mint bg-slate-950 text-foreground"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="size-2 rounded-full bg-mint" />
          <span>DOM & Hygiene</span>
          <span className="rounded-full bg-mint/20 px-1.5 py-0.2 text-[10px] font-bold text-mint">3 Checked</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("json")}
          className={`flex items-center gap-2 rounded-t-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "json"
              ? "border-t-2 border-blue-500 bg-slate-950 text-foreground"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="size-2 rounded-full bg-blue-400" />
          <span>Raw Evidence JSON</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6 font-mono text-xs leading-relaxed min-h-[220px]">
        {activeTab === "console" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <span>🔴 Uncaught TypeError: Cannot read properties of undefined (reading 'tier')</span>
              </div>
              <p className="mt-1 text-slate-300">
                at PricingTable (Pricing.tsx:34:12) <br />
                at renderWithHooks (react-dom.production.min.js:142:28)
              </p>
              <div className="mt-3 rounded-lg bg-slate-900/90 p-2.5 text-[11px] text-slate-300 border border-slate-800">
                <span className="text-amber-400 font-semibold">💡 Impact on User:</span> When a customer opens your pricing page with no active plan, the entire section throws an exception, showing a blank screen.
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              ✓ 14 other JavaScript scripts executed without warnings.
            </p>
          </div>
        )}

        {activeTab === "network" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber/30 bg-amber/10 p-4">
              <div className="flex items-center gap-2 text-amber font-bold">
                <span>⚠️ HTTP 401 Unauthorized — GET https://api.yourapp.com/v1/user/profile</span>
              </div>
              <p className="mt-1 text-slate-300">
                Initiator: AuthProvider.tsx:88 <br />
                Request Header: Authorization: Bearer (missing token)
              </p>
              <div className="mt-3 rounded-lg bg-slate-900/90 p-2.5 text-[11px] text-slate-300 border border-slate-800">
                <span className="text-amber-400 font-semibold">💡 Impact on User:</span> Supabase OAuth redirect URL was set to localhost instead of your production domain, dropping auth tokens in production.
              </div>
            </div>
          </div>
        )}

        {activeTab === "dom" && (
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5 rounded-xl border border-mint/30 bg-mint/5 p-3 text-slate-300">
              <span className="text-mint font-bold">✓</span>
              <div>
                <p className="font-semibold text-mint">Responsive Viewport Verified</p>
                <p className="text-[11px] text-slate-400">Viewport meta present. Zero horizontal scroll overflow on desktop & mobile.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-amber/30 bg-amber/5 p-3 text-slate-300">
              <span className="text-amber font-bold">⚠️</span>
              <div>
                <p className="font-semibold text-amber">Images Missing Alt Attributes (2 found)</p>
                <p className="text-[11px] text-slate-400">&lt;img src="/hero-illustration.png"&gt; lacks an alt tag, hurting screen readers & SEO.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-amber/30 bg-amber/5 p-3 text-slate-300">
              <span className="text-amber font-bold">⚠️</span>
              <div>
                <p className="font-semibold text-amber">Dead Link &lt;a href="#"&gt;</p>
                <p className="text-[11px] text-slate-400">Empty anchor tag in footer leads to no destination.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "json" && (
          <pre className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-[11px] text-emerald-400 overflow-x-auto">
{`{
  "target_url": "https://yourapp.com",
  "audit_version": "1.0-chromium-engine",
  "finished_at": "2026-10-15T20:30:12Z",
  "summary": {
    "bug_count": 1,
    "needs_review_count": 2,
    "passed_count": 8
  },
  "browser_metadata": {
    "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome",
    "viewport": { "width": 1440, "height": 900 }
  }
}`}
          </pre>
        )}
      </div>
    </div>
  );
}

function Index() {
  const [quickUrl, setQuickUrl] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
          {/* Ambient Colorful Background Glows */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-violet-600/25 via-primary/20 to-emerald-500/15 blur-[140px]"
          />

          <div className="relative mx-auto max-w-6xl px-6">
            <div className="flex flex-col items-center text-center">
              {/* Trust Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint/10 px-4 py-1.5 text-xs font-semibold text-mint shadow-sm shadow-mint/10">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-mint"></span>
                </span>
                <span>Now Live — 1 Free Sample Audit Included</span>
              </div>

              {/* Psychology-Driven Main Headline */}
              <h1 className="mt-6 max-w-4xl font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
                Never let your first paying user be your{" "}
                <span className="bg-gradient-to-r from-violet-400 via-primary to-emerald-400 bg-clip-text text-transparent">
                  QA tester.
                </span>
              </h1>

              {/* Compelling Value Proposition Subtitle */}
              <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-xl leading-relaxed">
                When you build with AI, code moves 10x faster than manual testing. PreLaunchQA loads your web app in a real Chromium browser to catch silent console errors, dead links, and broken auth redirects before launch.
              </p>

              {/* Instant Quick-Audit Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  window.location.href = `/auth${quickUrl ? `?targetUrl=${encodeURIComponent(quickUrl)}` : ""}`;
                }}
                className="mt-8 flex w-full max-w-lg flex-col gap-2.5 sm:flex-row"
              >
                <input
                  type="url"
                  required
                  value={quickUrl}
                  onChange={(e) => setQuickUrl(e.target.value)}
                  placeholder="https://mycoolapp.com"
                  className="min-w-0 flex-1 rounded-2xl border border-border/80 bg-card/80 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none backdrop-blur transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-gradient-to-r from-violet-600 via-primary to-indigo-600 px-6 py-3.5 font-display text-sm font-bold text-white shadow-xl shadow-violet-500/25 transition hover:brightness-110 active:scale-95 shrink-0"
                >
                  Audit in Chromium →
                </button>
              </form>

              {/* Color Meaning Legend */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-mint" /> Mint = Verified & Passed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-coral" /> Coral = Runtime Exception
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber" /> Amber = Needs Attention
                </span>
              </div>
            </div>

            {/* Interactive Real-Browser Terminal Preview */}
            <InteractiveDevToolsPreview />
          </div>
        </section>

        {/* What You Receive — Client Deliverables Showcase */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="text-center">
            <span className="inline-block rounded-full bg-primary/20 px-3.5 py-1 text-xs font-semibold text-primary mb-3">
              Clear Tangible Outputs
            </span>
            <h2 className="font-display text-2xl font-bold sm:text-4xl">What You Receive in Every Audit Report</h2>
            <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm text-muted-foreground">
              We don't give you arbitrary 0-100 scores. We give you raw browser evidence and copy-paste AI fix prompts to get your app launch-ready in minutes.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Deliverable 1 */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-700/80 bg-slate-950/70 p-6 shadow-lg backdrop-blur">
              <div>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-foreground">
                  1. Raw Browser Evidence
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Exact JavaScript console stack traces, network 4xx/5xx dumps, blocked assets, and DOM line numbers captured by real Chromium.
                </p>
              </div>
              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 font-mono text-[10px] text-rose-300">
                &gt; TypeError: Cannot read 'user' at Auth.tsx:42
              </div>
            </div>

            {/* Deliverable 2 */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-700/80 bg-slate-950/70 p-6 shadow-lg backdrop-blur">
              <div>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-foreground">
                  2. Ready AI Fix Prompts
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Formatted prompts tailored for Cursor, Bolt, Next.js, or v0 so you can paste the finding directly into your AI tool to fix it in 30 seconds.
                </p>
              </div>
              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 font-mono text-[10px] text-primary">
                "Fix auth callback redirect mismatch..."
              </div>
            </div>

            {/* Deliverable 3 */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-700/80 bg-slate-950/70 p-6 shadow-lg backdrop-blur">
              <div>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-mint/10 text-mint">
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-foreground">
                  3. Verified Launch Badge
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Dynamic SVG verification badge for your GitHub README and site footer proving to users and investors that your app works in a real browser.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-center rounded-xl border border-mint/30 bg-mint/10 p-2 font-display text-[10px] font-bold text-mint">
                PreLaunchQA Verified ✓
              </div>
            </div>

            {/* Deliverable 4 */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-700/80 bg-slate-950/70 p-6 shadow-lg backdrop-blur">
              <div>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="16 3 21 3 21 8" />
                    <line x1="4" y1="20" x2="21" y2="3" />
                    <polyline points="21 16 21 21 16 21" />
                    <line x1="15" y1="15" x2="21" y2="21" />
                    <line x1="4" y1="4" x2="9" y2="9" />
                  </svg>
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-foreground">
                  4. Before / After Diffs
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Re-scan with 1 click to verify that previous bugs are resolved and no new regressions were introduced after updating your codebase.
                </p>
              </div>
              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 font-mono text-[10px] text-blue-400">
                Diff: 2 Bugs Resolved · 0 Regressions
              </div>
            </div>
          </div>
        </section>

        {/* Who Is This For — Platform Cards */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold sm:text-4xl">Built for Modern Web Builders Who Ship Fast</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
              Modern frontend code moves fast. But runtime exceptions, broken redirects, and missing env vars only trigger when real users load the page.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                tool: "Next.js & React",
                accent: "border-indigo-500/40 bg-indigo-500/5 text-indigo-300",
                desc: "Full-stack web applications. Catch hydration mismatches, auth redirect loops, and unhandled null object reads before launch.",
              },
              {
                tool: "Bolt.new",
                accent: "border-amber-500/40 bg-amber-500/5 text-amber-300",
                desc: "Rapid prototypes running in WebContainers. Catch serverless dynamic import failures and SPA 404 routing traps.",
              },
              {
                tool: "Cursor",
                accent: "border-cyan-500/40 bg-cyan-500/5 text-cyan-300",
                desc: "AI-assisted code that passes TypeScript compile checks but breaks in real browser DOM hierarchies.",
              },
              {
                tool: "v0 & Windsurf",
                accent: "border-emerald-500/40 bg-emerald-500/5 text-emerald-300",
                desc: "Complex UI layouts that look great on one screen but suffer silent CSS overflow and unlabelled forms.",
              },
            ].map((item) => (
              <div
                key={item.tool}
                className={`rounded-3xl border p-6 backdrop-blur-sm transition-all hover:scale-[1.02] ${item.accent}`}
              >
                <h3 className="font-display text-base font-bold">
                  {item.tool}
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Section: Manual vs PreLaunchQA */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Why not just test it manually?</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            You can. But here is the reality of manual testing versus what an automated Chromium worker checks in 60 seconds.
          </p>
          <div className="mt-8 overflow-hidden rounded-3xl border border-border/80 bg-card/60 backdrop-blur">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="px-5 py-3.5 text-left font-semibold text-muted-foreground">Check Item</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-coral">Manual Checking</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-mint">PreLaunchQA Chromium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {[
                  ["Console errors", "Open DevTools on 5 devices, scroll through logs", "Automatic — every error logged with full stack trace"],
                  ["Broken links & dead hrefs", "Click each link one by one manually", "Every link & anchor on the page verified in seconds"],
                  ["Missing alt text & a11y", "Inspect element on every single image", "All missing labels & alt gaps flagged with DOM selectors"],
                  ["Failed API network calls", "Watch Network tab while clicking around", "Every 4xx/5xx network failure recorded with payload"],
                  ["Mixed content security", "Check Security panel for unencrypted resources", "All http:// assets on https:// pages blocked & reported"],
                  ["After code changes", "Repeat all of the above from scratch", "One-click re-scan with automatic before/after diff"],
                ].map(([check, manual, auto]) => (
                  <tr key={check} className="bg-background/40 hover:bg-background/80 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-foreground">{check}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{manual}</td>
                    <td className="px-5 py-3.5 text-xs font-medium text-mint">{auto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* How It Works Steps */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">How an Audit Runs</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="rounded-3xl border border-border/80 bg-card/60 p-6 backdrop-blur">
                <span className="font-display text-xs font-bold text-primary">{item.step}</span>
                <h3 className="mt-3 font-display text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What Is Covered & Roadmap */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">What the Check Covers — and What is Coming Next</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-mint/40 bg-mint/5 p-6 backdrop-blur">
              <h3 className="font-display text-lg font-bold text-mint">Currently Checked</h3>
              <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
                {currentlyChecked.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-mint" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-primary/40 bg-primary/5 p-6 backdrop-blur">
              <h3 className="font-display text-lg font-bold text-primary">Coming Next (Roadmap)</h3>
              <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
                {comingNext.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-coral/40 bg-coral/5 p-6 backdrop-blur">
              <h3 className="font-display text-lg font-bold text-coral">Deliberately Out of Scope</h3>
              <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
                {excluded.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-coral" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Human Decides Guarantee */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="rounded-3xl border border-amber/40 bg-amber/5 p-6 sm:p-8 backdrop-blur">
            <h2 className="font-display text-xl font-bold text-amber">Where a human still decides</h2>
            <p className="mt-3 max-w-3xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Once checks go live, scanning and reporting run automatically. Three things stay with
              a person on purpose: authorising a scan of an app, approving any outreach before it is
              sent, and deciding refunds. Anything else would put you on the wrong side of
              permission rules.
            </p>
          </div>
        </section>

        {/* Trust & Verification Credentials */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: "🔒",
                title: "Ownership Verified",
                desc: "We verify you own the domain before any check runs. DNS record, meta tag, or file — your choice.",
              },
              {
                icon: "🛡️",
                title: "No Code Access Needed",
                desc: "We only need your public URL. We never access your source code, production database, or deployment credentials.",
              },
              {
                icon: "📋",
                title: "Evidence, Not Opinions",
                desc: "Every finding includes the raw browser data that produced it. Verify for yourself — nothing is hidden.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-border/80 bg-card/60 p-6 text-center backdrop-blur"
              >
                <span className="text-3xl">{item.icon}</span>
                <h3 className="mt-3 font-display text-base font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold sm:text-4xl">Simple, Transparent Pricing</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
              Run a free sample audit on your homepage, or unlock deep multi-page audits and continuous re-testing.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                name: "Sample Scan",
                price: "Free",
                period: "",
                badge: "Get started",
                body: "Single-page check. Shows you the report format and raw browser evidence on your homepage.",
                cta: "Start free check",
                href: "/auth",
                highlight: false,
              },
              {
                name: "Launch Check",
                price: "$49",
                period: "one-time",
                badge: "Most popular",
                body: "Deep pre-launch check: multi-page crawl, interactive critical flows, full evidence bundle, 5 scan credits, and 1 included re-scan comparison diff.",
                cta: "Get launch check",
                href: "/auth",
                highlight: true,
              },
              {
                name: "Monthly Re-test",
                price: "$99",
                period: "/month",
                badge: "Continuous QA",
                body: "Unlimited automated checks, before/after deploy comparison diffs, priority worker queue, and automatic failure alerts.",
                cta: "Subscribe monthly",
                href: "/auth",
                highlight: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col justify-between rounded-3xl border p-7 backdrop-blur-md transition-all ${
                  tier.highlight
                    ? "border-primary/60 bg-primary/5 shadow-2xl shadow-primary/10"
                    : "border-border/80 bg-card/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-bold">{tier.name}</h3>
                    {tier.badge && (
                      <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {tier.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-extrabold text-foreground">
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-xs text-muted-foreground">{tier.period}</span>
                    )}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{tier.body}</p>
                </div>
                <div className="mt-8 pt-2">
                  <Link
                    to={tier.href}
                    className={`block w-full rounded-xl py-3 text-center font-display text-xs font-bold transition active:scale-95 ${
                      tier.highlight
                        ? "bg-gradient-to-r from-violet-600 to-primary text-white shadow-lg shadow-primary/25 hover:brightness-110"
                        : "border border-border/80 bg-background/80 text-foreground hover:bg-muted"
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Early Access / Waitlist */}
        <section className="mx-auto max-w-3xl px-6 pb-24">
          <div className="rounded-3xl border border-border/80 bg-card/60 p-6 sm:p-10 backdrop-blur text-center">
            <h2 className="font-display text-2xl font-bold">Stay Updated on New Chromium Rules</h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
              We add new AI-specific detection heuristics every week. Enter your email to receive quality updates.
            </p>
            <div className="mt-6 max-w-md mx-auto">
              <SignupForm
                intent="waitlist"
                submitLabel="Join the list"
                successMessage="We'll keep you updated with new browser detection capabilities."
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
