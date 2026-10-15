import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const Route = createFileRoute("/preorder")({
  head: () => ({
    meta: [
      { title: "Pricing & Plans — PreLaunchQA" },
      {
        name: "description",
        content:
          "Browser-based quality audits for AI-built web apps. Free sample scan, $49 Launch Pack, or $99/mo continuous QA. Supports Cards, PayPal, and Razorpay.",
      },
      { property: "og:title", content: "Pricing & Plans — PreLaunchQA" },
      {
        property: "og:description",
        content:
          "Comprehensive browser QA audits for AI-built web apps. Start free or unlock deep audits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Preorder,
});

const tiers = [
  {
    name: "Sample Scan",
    price: "Free",
    period: "",
    highlight: false,
    deliverables: "Instant Single-Page Check",
    features: [
      "Single-page check (homepage)",
      "Raw browser console & network logs",
      "Dead links & basic DOM hygiene",
      "Full JSON evidence bundle",
      "Free shareable badge embed",
    ],
    cta: "Start free check",
  },
  {
    name: "Launch Check",
    price: "$49",
    period: "one-time",
    highlight: true,
    deliverables: "5 Deep Audits + AI Prompts",
    features: [
      "Multi-page deep audit (up to 20 pages)",
      "Interactive flows (forms, auth, navigation)",
      "Full evidence bundle (screenshots & trace data)",
      "5 scan credits included",
      "1 included re-scan comparison diff",
      "Direct AI fix prompts for Lovable/Bolt/Cursor",
      "Priority worker execution queue",
    ],
    cta: "Get launch pack",
  },
  {
    name: "Monthly Re-test",
    price: "$99",
    period: "/month",
    highlight: false,
    deliverables: "Continuous Autonomous QA",
    features: [
      "Unlimited automated Chromium checks",
      "Before/after deploy comparison diffs",
      "Automatic failure alerting & webhook hooks",
      "Dedicated priority worker queue",
      "Custom test credentials vault (24h retention)",
      "Multi-environment audits (staging + production)",
    ],
    cta: "Subscribe monthly",
  },
];

function Preorder() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center">
          <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-3">
            Clear, Transparent Pricing
          </span>
          <h1 className="font-display text-3xl font-extrabold sm:text-5xl">
            Audit in Real Chromium. Launch with Proof.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Every audit runs in an isolated, real Chromium browser session. Catch silent console errors,
            broken links, and failed redirects before your paying users see them.
          </p>
        </div>

        {/* Accepted Payment Methods Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-border/80 bg-card/60 p-4 text-xs backdrop-blur">
          <span className="font-semibold text-muted-foreground">Accepted Payment Methods:</span>
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span>💳</span> Global Cards (Stripe)
          </span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span>🅿️</span> PayPal (International)
          </span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span>⚡</span> Razorpay (UPI, Netbanking & Cards)
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col justify-between rounded-3xl border p-7 backdrop-blur-md transition-all ${
                tier.highlight
                  ? "border-primary/60 bg-primary/5 shadow-2xl shadow-primary/10"
                  : "border-border/80 bg-card/60"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-primary px-3.5 py-1 font-display text-[11px] font-bold text-white shadow-md shadow-primary/30">
                  Most Popular
                </span>
              )}
              <div>
                <h2 className="font-display text-xl font-bold">{tier.name}</h2>
                <div className="mt-1 text-[11px] font-semibold text-primary">
                  {tier.deliverables}
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold">{tier.price}</span>
                  {tier.period && (
                    <span className="text-xs text-muted-foreground">{tier.period}</span>
                  )}
                </div>
                <ul className="mt-6 space-y-3 text-xs text-muted-foreground">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-mint" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                <Link
                  to="/auth"
                  className={`block w-full rounded-xl py-3 text-center font-display text-xs font-bold transition active:scale-95 ${
                    tier.highlight
                      ? "bg-gradient-to-r from-violet-600 to-primary text-white shadow-lg shadow-primary/25 hover:brightness-110"
                      : "border border-border/80 bg-background/80 text-foreground hover:bg-muted"
                  }`}
                >
                  {tier.cta} →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Why Clients Choose PreLaunchQA */}
        <section className="mt-16 rounded-3xl border border-border/80 bg-card/60 p-6 sm:p-10 backdrop-blur">
          <h2 className="font-display text-xl font-bold text-center sm:text-2xl">
            Why Builders Choose PreLaunchQA Over Manual Testing
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3 text-xs leading-relaxed text-muted-foreground">
            <div>
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-display text-sm font-bold text-foreground">Save 4+ Hours Per Release</h3>
              <p className="mt-1">
                Stop manually opening DevTools, clicking every link, and testing form validations. Chromium tests everything in 60 seconds.
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2">🤖</div>
              <h3 className="font-display text-sm font-bold text-foreground">1-Click Fix Prompts</h3>
              <p className="mt-1">
                Every error includes an exact prompt for Lovable, Bolt, Cursor, or v0. Just copy and paste into your AI assistant.
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2">🔒</div>
              <h3 className="font-display text-sm font-bold text-foreground">Zero Code Access Needed</h3>
              <p className="mt-1">
                We only need your public URL. We never access your GitHub repo, production database, or deployment credentials.
              </p>
            </div>
          </div>
        </section>

        {/* 100% Refund Guarantee */}
        <div className="mt-8 rounded-3xl border border-mint/40 bg-mint/5 p-6 text-center sm:p-8 backdrop-blur">
          <h2 className="font-display text-lg font-bold text-mint">100% Money-Back Guarantee</h2>
          <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground leading-relaxed">
            If our real-browser check fails to execute on your verified app, or you are unsatisfied with the findings report, we refund your payment in full — no questions asked.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
