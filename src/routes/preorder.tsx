import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const Route = createFileRoute("/preorder")({
  head: () => ({
    meta: [
      { title: "Get a launch check — PreLaunchQA" },
      {
        name: "description",
        content:
          "Run a comprehensive browser-based quality check on your AI-built web app. Free sample scan, $49 deep audit, or $99/mo continuous testing.",
      },
      { property: "og:title", content: "Get a launch check — PreLaunchQA" },
      {
        property: "og:description",
        content:
          "Comprehensive browser-based quality checks for AI-built web apps. Start free or go deep.",
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
    features: [
      "Single-page check (homepage)",
      "Raw browser console & network logs",
      "Dead links & basic DOM hygiene",
      "Full evidence for every finding",
    ],
    cta: "Start free check",
  },
  {
    name: "Launch Check",
    price: "$49",
    period: "one-time",
    highlight: true,
    features: [
      "Multi-page deep audit (up to 20 pages)",
      "Interactive flows (forms, auth, navigation)",
      "Full evidence bundle (screenshots & trace data)",
      "5 scan credits included",
      "1 included re-scan comparison diff",
      "Direct email report export",
    ],
    cta: "Get launch check",
  },
  {
    name: "Monthly Re-test",
    price: "$99",
    period: "/month",
    highlight: false,
    features: [
      "Unlimited automated checks",
      "Before/after deploy comparison diffs",
      "Automatic failure alerting",
      "Dedicated priority worker queue",
      "Custom test credentials vault",
    ],
    cta: "Subscribe monthly",
  },
];

function Preorder() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <h1 className="text-center text-3xl sm:text-5xl">Choose your check</h1>
        <p className="mx-auto mt-5 max-w-2xl text-center text-muted-foreground">
          Every plan includes real Chromium browser testing, ownership verification, and raw
          evidence for every finding. Start with a free sample or go deep.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col justify-between rounded-3xl border p-6 ${
                tier.highlight
                  ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/5"
                  : "border-border bg-card"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <div>
                <h2 className="text-lg font-semibold">{tier.name}</h2>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold">{tier.price}</span>
                  {tier.period && (
                    <span className="text-sm text-muted-foreground">{tier.period}</span>
                  )}
                </div>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-3">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-mint" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                <Link
                  to="/auth"
                  className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition ${
                    tier.highlight
                      ? "bg-primary text-primary-foreground hover:brightness-110"
                      : "border border-border bg-muted/60 text-foreground hover:bg-muted"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl border border-border bg-card p-6 text-center sm:p-8">
          <h2 className="text-xl font-semibold">100% refund guarantee</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            If the check does not run or you are unsatisfied with the results, we refund you in
            full — no questions asked. Every finding is backed by raw browser evidence you can
            verify yourself.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
