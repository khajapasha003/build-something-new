import { createFileRoute, Link } from "@tanstack/react-router";

import { SignupForm } from "@/components/SignupForm";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import demoAsset from "@/assets/demo.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PreLaunchQA — automated browser checks for your AI-built app" },
      {
        name: "description",
        content:
          "PreLaunchQA loads your web app in a real Chromium browser and returns console errors, failed network requests, broken links, and accessibility gaps with raw evidence.",
      },
      { property: "og:title", content: "PreLaunchQA — real browser checks. Launch with proof." },
      {
        property: "og:description",
        content:
          "Automated browser checks for AI-built web apps: console errors, failed network calls, dead links, and raw evidence for every finding.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const currentlyChecked = [
  "Page HTTP response status (200, 4xx, 5xx, or unreachable)",
  "Browser console errors logged during page load",
  "Failed network requests and resource calls",
  "Page title",
  "Search description meta tag",
  "Mobile viewport meta tag",
  "HTML language attribute (html lang)",
  "Images without alternative text",
  "Form fields without labels",
  "Insecure mixed content (http:// on https://)",
  "Dead links (empty, '#', or javascript:void)",
];

const comingNext = [
  "Multi-page crawling across internal links",
  "Interactive flows in a real browser: signup, login, logout, password reset, and main forms",
  "Test-mode checkout walkthroughs and payment form validation",
  "Visual evidence bundle: screenshots, video recordings, and Playwright traces",
  "Downloadable reproduction scripts and AI fix prompts per finding",
  "Responsive dual-breakpoint checks (1440px and 390px) with horizontal overflow detection",
  "Passive secret pattern scanning in public bundles and security headers inspection",
];

const excluded = [
  "Native mobile apps and desktop apps",
  "Active attacks: SQL injection, brute force, fuzzing, denial of service",
  "Real payments or changes to your production data — test mode and test accounts only",
  '"Certified", "secure" or "bug-free" badges. We report evidence, not guarantees',
  "Auto-fixing your code or pushing to your repository",
  "Scanning any site without verified owner permission",
];

const steps = [
  {
    step: "01",
    title: "Verify you own the app",
    body: "Add a DNS record, meta tag, or verification file. Nothing is checked until ownership checks out.",
  },
  {
    step: "02",
    title: "We inspect your page",
    body: "A real Chromium browser loads your homepage and records console errors, failed network calls, dead links, and DOM hygiene.",
  },
  {
    step: "03",
    title: "You get evidence",
    body: "Each finding carries raw JSON evidence directly from the browser session, plus an automatic before/after diff when you re-scan.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]"
          />
          <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 sm:pt-28">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-mint" />
              In development — pre-orders open
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl leading-[1.05] sm:text-6xl">
              Your AI-built web app, checked in a real browser before launch.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Every bug comes back with raw browser evidence. No scores, no badges, no claims we
              cannot show you the evidence for.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/preorder"
                className="rounded-xl bg-primary px-6 py-3 font-display font-semibold text-primary-foreground transition hover:brightness-110"
              >
                Pre-order a launch check
              </Link>
              <a
                href="#demo"
                className="rounded-xl border border-border px-6 py-3 font-display font-semibold transition hover:bg-card"
              >
                Watch the demo
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-mint" /> Mint = passed
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-coral" /> Coral = bug
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber" /> Amber = needs review
              </span>
            </div>
          </div>
        </section>

        <section id="demo" className="mx-auto max-w-5xl px-6 pb-20">
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <video
              src={demoAsset.url}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full bg-ink"
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            A recording of the product as it stands today. It is not a finished release.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="text-2xl sm:text-3xl">How a check runs</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="rounded-2xl border border-border bg-card p-6">
                <span className="font-display text-sm text-primary">{item.step}</span>
                <h3 className="mt-3 text-lg">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="text-2xl sm:text-3xl">What the check covers — and what is coming next</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-mint/30 bg-mint/5 p-6">
              <h3 className="text-lg text-mint">Currently checked</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {currentlyChecked.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-mint" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
              <h3 className="text-lg text-primary">Coming next (Roadmap)</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {comingNext.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-coral/30 bg-coral/5 p-6">
              <h3 className="text-lg text-coral">Deliberately out of scope</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {excluded.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-coral" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="rounded-3xl border border-amber/30 bg-amber/5 p-6 sm:p-8">
            <h2 className="text-xl text-amber">Where a human still decides</h2>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              Scanning, reporting, re-tests and billing run automatically. Three things stay with a
              person on purpose: authorising a scan of an app, approving any outreach before it is
              sent, and deciding refunds. Anything else would put you on the wrong side of
              permission rules.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="text-2xl sm:text-3xl">Pricing</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Final prices are set when the first paid checks go live. Pre-order now and we confirm
            your price by email before charging anything.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                name: "Sample scan",
                price: "Free",
                body: "Single-page check. Shows you the report format and raw browser evidence on your homepage.",
              },
              {
                name: "Launch check (Coming next)",
                price: "One-time",
                body: "Pre-order: Multi-page crawl, interactive critical flows, responsive pass, full evidence bundle, one re-scan.",
              },
              {
                name: "Re-test plan (Coming next)",
                price: "Monthly",
                body: "Scheduled re-runs with a before/after diff after each deploy cycle.",
              },
            ].map((tier) => (
              <div key={tier.name} className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-lg">{tier.name}</h3>
                <p className="mt-1 font-display text-2xl text-primary">{tier.price}</p>
                <p className="mt-3 text-sm text-muted-foreground">{tier.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-24">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-2xl">Get early access</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tell us where your app lives. We only email you about PreLaunchQA.
            </p>
            <div className="mt-6">
              <SignupForm
                intent="waitlist"
                submitLabel="Join the list"
                successMessage="We'll be in touch before the first checks go out."
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
