import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const Route = createFileRoute("/presentation")({
  head: () => ({
    meta: [
      { title: "Client Demo & Pitch Presentation — PreLaunchQA" },
      {
        name: "description",
        content:
          "Official interactive pitch deck, client demo presentation, and downloadable executive slides for PreLaunchQA.",
      },
      { property: "og:title", content: "Client Demo Presentation — PreLaunchQA" },
      {
        property: "og:description",
        content:
          "Explore features, deliverables, automated Chromium audit architecture, and global standards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PresentationPage,
});

const SLIDES = [
  {
    id: 1,
    tag: "EXECUTIVE SUMMARY",
    title: "PreLaunchQA: The Autonomous Browser QA Cloud",
    subtitle: "Real headless Chromium inspection for modern web applications before going live.",
    content: (
      <div className="space-y-6">
        <p className="text-base text-slate-300 leading-relaxed">
          Modern web applications built with AI assistants (Cursor, Bolt, Next.js, React) ship code faster than ever. However, traditional linters and static tests fail to detect runtime console errors, failed async fetches, and broken routes.
        </p>
        <div className="grid gap-4 sm:grid-cols-3 pt-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center">
            <span className="text-3xl">⚡</span>
            <h4 className="mt-3 font-display text-sm font-bold text-foreground">Zero Code Access</h4>
            <p className="mt-1 text-xs text-muted-foreground">We never need repository access. Audits run from public URLs.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center">
            <span className="text-3xl">🌐</span>
            <h4 className="mt-3 font-display text-sm font-bold text-foreground">Real Headless Chromium</h4>
            <p className="mt-1 text-xs text-muted-foreground">DevTools console, network waterfall, and accessibility logs.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center">
            <span className="text-3xl">🛡️</span>
            <h4 className="mt-3 font-display text-sm font-bold text-foreground">Verified Ownership</h4>
            <p className="mt-1 text-xs text-muted-foreground">DNS TXT or Meta tag verification ensures complete security.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    tag: "THE PROBLEM",
    title: "The 'Runtime Blind Spot' in Modern Web Development",
    subtitle: "Code compiles cleanly, but crashes when real users interact with the browser.",
    content: (
      <div className="space-y-6">
        <div className="rounded-2xl border border-coral/30 bg-coral/5 p-6">
          <h4 className="font-display text-base font-bold text-coral">Why Traditional QA Tools Fail:</h4>
          <ul className="mt-3 space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-coral">✕</span>
              <span><strong>Theoretical Performance Scores:</strong> Lighthouse gives an arbitrary 95 score while critical buttons throw unhandled JavaScript TypeError in the console.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-coral">✕</span>
              <span><strong>Silent Auth Redirect Traps:</strong> Custom domain OAuth callbacks redirect to broken URLs with zero server alerts.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-coral">✕</span>
              <span><strong>Ghost Assets:</strong> Images without alt tags, mixed content HTTP assets on HTTPS pages, and dead 404 navigation links destroy SEO and user trust.</span>
            </li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          PreLaunchQA bridges this gap by giving developers <strong>unfiltered, raw browser evidence</strong> rather than high-level opinions.
        </p>
      </div>
    ),
  },
  {
    id: 3,
    tag: "CLIENT DELIVERABLES",
    title: "What Clients Receive: 4 Tangible Deliverables",
    subtitle: "Every audit delivers actionable, proof-backed outputs ready for engineering and stakeholders.",
    content: (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <span className="text-2xl">📋</span>
          <h4 className="mt-2 font-display text-sm font-bold text-foreground">1. Raw Browser Evidence Bundle</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete DevTools JSON capture containing timestamped console errors, stack traces, and HTTP 4xx/5xx network failure payloads.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <span className="text-2xl">🤖</span>
          <h4 className="mt-2 font-display text-sm font-bold text-foreground">2. 1-Click AI Fix Prompts</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Formatted, ready-to-paste prompts tailored for Cursor, Bolt, or ChatGPT that allow developers to resolve each bug in 30 seconds.
          </p>
        </div>
        <div className="rounded-2xl border border-mint/30 bg-mint/5 p-5">
          <span className="text-2xl">🛡️</span>
          <h4 className="mt-2 font-display text-sm font-bold text-foreground">3. Embeddable Verified Launch Badge</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Dynamic SVG badge for your GitHub README and site footer proving to customers and investors that your release is verified.
          </p>
        </div>
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5">
          <span className="text-2xl">📊</span>
          <h4 className="mt-2 font-display text-sm font-bold text-foreground">4. Before / After Comparison Diffs</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            One-click re-scan comparison showing exactly which previous bugs were resolved and confirming zero new regressions.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    tag: "HOW TO USE WORKFLOW",
    title: "Simple 4-Step Client Workflow",
    subtitle: "From URL submission to comprehensive audit resolution in under 3 minutes.",
    content: (
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          {
            step: "01",
            title: "Submit URL",
            desc: "Enter your staging or production web app URL on the dashboard.",
          },
          {
            step: "02",
            title: "Verify in 30s",
            desc: "Add a simple DNS TXT record or HTML meta tag to verify domain ownership.",
          },
          {
            step: "03",
            title: "Chromium Audit",
            desc: "Headless Chromium launches, crawls routes, and logs all DevTools activities.",
          },
          {
            step: "04",
            title: "Resolve & Badge",
            desc: "Copy 1-click AI fix prompts, resolve bugs, and embed the verified badge.",
          },
        ].map((item) => (
          <div key={item.step} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="font-mono text-xs font-bold text-primary">{item.step}</span>
            <h4 className="mt-2 font-display text-sm font-semibold text-foreground">{item.title}</h4>
            <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 5,
    tag: "AUTOMATED ENGINES",
    title: "Engine Architecture & Worker Cluster",
    subtitle: "High-throughput asynchronous distributed scanning cluster.",
    content: (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300">
          <div className="text-emerald-400 font-bold mb-2">● SYSTEM ARCHITECTURE (AWS Lightsail + Cloudflare Edge)</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2 border border-slate-800 rounded bg-slate-900">
              <span className="text-primary font-bold">1. Edge Router:</span> Cloudflare Global Proxy, SSL Full/Flexible, Brotli, WAF
            </div>
            <div className="p-2 border border-slate-800 rounded bg-slate-900">
              <span className="text-mint font-bold">2. Web Cluster:</span> Standalone Node.js SSR Server, Nginx Reverse Proxy (Port 80/443)
            </div>
            <div className="p-2 border border-slate-800 rounded bg-slate-900">
              <span className="text-amber font-bold">3. Scan Worker:</span> Headless Playwright Chromium, HMAC Security Token Claiming
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Workers poll local queues securely using HMAC-SHA256 signatures, ensuring zero unauthorized scan executions and complete tenant isolation.
        </p>
      </div>
    ),
  },
  {
    id: 6,
    tag: "AI INTEGRATION",
    title: "PreLaunchQA Model Context Protocol (MCP) Server",
    subtitle: "Empowering AI coding assistants to audit web apps programmatically.",
    content: (
      <div className="space-y-4">
        <p className="text-xs text-slate-300 leading-relaxed">
          PreLaunchQA provides an official <strong>Model Context Protocol (MCP)</strong> server. AI agents in Cursor, Claude Desktop, and Windsurf can directly run browser tests and inspect findings without leaving their coding editor.
        </p>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-emerald-400">
          <div>// Available MCP Tools:</div>
          <div className="mt-1 text-slate-300">1. <span className="text-primary">prelaunchqa_inspect_url</span> — Audits any URL via Chromium</div>
          <div className="text-slate-300">2. <span className="text-primary">prelaunchqa_generate_fix_prompt</span> — Context-aware bug fix prompt</div>
          <div className="text-slate-300">3. <span className="text-primary">prelaunchqa_get_version</span> — Server commit and operational status</div>
          <div className="text-slate-300">4. <span className="text-primary">prelaunchqa_get_badge_url</span> — Embeddable SVG badge markdown</div>
        </div>
        <p className="text-xs text-muted-foreground">
          Endpoint documentation available live at: <code className="text-primary">https://prelaunchqa.com/api/public/mcp</code>
        </p>
      </div>
    ),
  },
  {
    id: 7,
    tag: "PAYMENT INFRASTRUCTURE",
    title: "Global Multi-Gateway Monetization",
    subtitle: "Built for seamless international transactions and frictionless checkouts.",
    content: (
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <span className="text-2xl">🅿️</span>
          <h4 className="mt-2 font-display text-sm font-bold text-foreground">PayPal Global</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Full PayPal v2 Orders API with automated capture, sandbox testing, and international currency support.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <span className="text-2xl">⚡</span>
          <h4 className="mt-2 font-display text-sm font-bold text-foreground">Razorpay UPI & Cards</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Native support for Indian payment flows including Google Pay, PhonePe, Paytm, and netbanking.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <span className="text-2xl">💳</span>
          <h4 className="mt-2 font-display text-sm font-bold text-foreground">Stripe Hosted Checkout</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            International credit and debit card processing with webhook fulfillment and customer subscription portal.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 8,
    tag: "PRICING & ROI",
    title: "Pricing Tiers & Enterprise Return on Investment",
    subtitle: "Transparent, value-driven plans for individual builders and high-velocity engineering teams.",
    content: (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-center">
            <h4 className="text-sm font-bold text-muted-foreground">Sample Scan</h4>
            <div className="mt-2 text-2xl font-bold font-display">Free</div>
            <p className="mt-2 text-xs text-muted-foreground">Single page homepage audit with raw console and network logs.</p>
          </div>
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5 text-center shadow-lg shadow-primary/10">
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">MOST POPULAR</span>
            <h4 className="mt-2 text-sm font-bold text-foreground">Launch Check</h4>
            <div className="mt-2 text-2xl font-bold font-display text-primary">$49</div>
            <p className="mt-2 text-xs text-muted-foreground">Deep multi-page crawl, interactive flows, 5 scan credits, and re-scan diff.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-center">
            <h4 className="text-sm font-bold text-muted-foreground">Monthly Re-test</h4>
            <div className="mt-2 text-2xl font-bold font-display">$99<span className="text-xs text-muted-foreground">/mo</span></div>
            <p className="mt-2 text-xs text-muted-foreground">Continuous automated verification, priority worker queue, and regression alerts.</p>
          </div>
        </div>
        <div className="text-center pt-2">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
          >
            Launch Free Check on PreLaunchQA →
          </Link>
        </div>
      </div>
    ),
  },
];

function PresentationPage() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const slide = SLIDES[currentSlideIndex];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        setCurrentSlideIndex((prev) => Math.min(prev + 1, SLIDES.length - 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleDownloadPDF() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:py-16 flex-1 w-full">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-mint animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-mint">Official Client Pitch Deck</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-bold mt-1">PreLaunchQA Presentation</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary/20 active:scale-95 print:hidden"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download Presentation (PDF / Print)</span>
            </button>

            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-110 print:hidden"
            >
              <span>Open Dashboard</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Presentation Slide Viewer (Interactive) */}
        <div className="mt-8 rounded-3xl border border-border/80 bg-card/70 backdrop-blur p-6 sm:p-10 shadow-2xl relative min-h-[460px] flex flex-col justify-between print:hidden">
          <div>
            <div className="flex items-center justify-between pb-6 border-b border-border/40">
              <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-mono font-bold text-primary">
                {slide.tag}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                Slide {slide.id} of {SLIDES.length}
              </span>
            </div>

            <div className="mt-6">
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground">
                {slide.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground font-medium">
                {slide.subtitle}
              </p>
            </div>

            <div className="mt-8">
              {slide.content}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="mt-10 pt-6 border-t border-border/40 flex items-center justify-between">
            <button
              type="button"
              disabled={currentSlideIndex === 0}
              onClick={() => setCurrentSlideIndex((prev) => Math.max(prev - 1, 0))}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-40"
            >
              ← Previous Slide
            </button>

            {/* Slide dots */}
            <div className="flex items-center gap-1.5">
              {SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`size-2.5 rounded-full transition ${
                    idx === currentSlideIndex ? "bg-primary scale-125" : "bg-border hover:bg-muted-foreground"
                  }`}
                  aria-label={`Jump to slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              disabled={currentSlideIndex === SLIDES.length - 1}
              onClick={() => setCurrentSlideIndex((prev) => Math.min(prev + 1, SLIDES.length - 1))}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
            >
              Next Slide →
            </button>
          </div>
        </div>

        {/* PRINT ONLY: Renders all slides on separate pages for PDF download */}
        <div className="hidden print:block space-y-12">
          {SLIDES.map((s) => (
            <div key={s.id} className="p-8 border border-slate-300 rounded-2xl page-break-after">
              <div className="flex justify-between items-center mb-4">
                <span className="font-mono text-xs font-bold text-slate-600">{s.tag}</span>
                <span className="font-mono text-xs text-slate-500">Slide {s.id} / {SLIDES.length}</span>
              </div>
              <h2 className="text-2xl font-bold font-display text-slate-900">{s.title}</h2>
              <p className="text-sm text-slate-600 mb-6">{s.subtitle}</p>
              <div>{s.content}</div>
            </div>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
