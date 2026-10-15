import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const Route = createFileRoute("/guides")({
  head: () => ({
    meta: [
      { title: "AI Web App Pre-Launch QA Guides — Lovable, Bolt, Cursor & v0" },
      {
        name: "description",
        content:
          "Complete pre-launch testing guides for AI-generated web apps. Learn how to catch console errors, broken routes, and network failures in Lovable, Bolt.new, Cursor, and v0 apps.",
      },
      { property: "og:title", content: "AI Web App Pre-Launch QA Guides — PreLaunchQA" },
      {
        property: "og:description",
        content:
          "Catch silent browser errors and broken flows in your AI-built web app before launch.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuidesPage,
});

type Platform = "lovable" | "bolt" | "cursor" | "v0";

const GUIDES: Record<
  Platform,
  {
    name: string;
    tagline: string;
    description: string;
    commonFailures: Array<{ title: string; detail: string; fix: string }>;
    checklist: string[];
  }
> = {
  lovable: {
    name: "Lovable",
    tagline: "Full-Stack App Testing Guide",
    description:
      "Lovable creates full-stack React and Vite applications with Supabase backends. While Lovable builds stunning UIs in seconds, runtime edge-cases like auth callback URLs and unhandled async mutations often slip into production.",
    commonFailures: [
      {
        title: "Supabase Auth Callback URL Mismatches",
        detail:
          "When deploying to custom domains, the OAuth redirect URI often defaults to localhost or the Lovable staging URL, causing login flows to fail silently in production.",
        fix: "Add your production origin to Supabase Authentication > URL Configuration > Redirect URLs, and run a PreLaunchQA check to verify OAuth redirects.",
      },
      {
        title: "Unhandled React Query / Async State",
        detail:
          "Components trying to access nested properties on data before Supabase queries resolve, resulting in 'Cannot read properties of undefined' console errors.",
        fix: "Use optional chaining (`data?.items`) and ensure every query has an explicit loading fallback in UI components.",
      },
      {
        title: "Environment Variable Leaks & Missing Secrets",
        detail:
          "VITE_ prefix omissions on client-side env vars cause runtime reference errors, while backend service keys can be inadvertently exposed in client bundles.",
        fix: "Verify that only VITE_ keys are accessed in frontend components and keep SUPABASE_SERVICE_ROLE_KEY server-side.",
      },
    ],
    checklist: [
      "Verify home and dashboard load without any red console errors in DevTools",
      "Check that all internal navigation links point to valid client routes, not 404s",
      "Test Supabase sign-up and sign-in flows with email magic link and Google OAuth",
      "Ensure all images render with proper alt text and no broken asset URLs",
      "Confirm that responsive mobile layout does not overflow horizontally",
    ],
  },
  bolt: {
    name: "Bolt.new",
    tagline: "Rapid Prototype Pre-Flight Audit",
    description:
      "Bolt.new runs in-browser Node.js environments (WebContainers) to generate full-stack apps. Prototypes that work seamlessly in the WebContainer sandbox can break when deployed to static hosts or serverless platforms.",
    commonFailures: [
      {
        title: "Serverless Route & Dynamic Import Failures",
        detail:
          "Node-specific packages (like `fs`, `path`, or Node-only crypto) bundled into browser client code throw runtime bundling errors upon initial page load.",
        fix: "Isolate server code to API endpoints or serverless functions and replace Node primitives with web standards (Web Crypto, Fetch API).",
      },
      {
        title: "Dead Routing in Single-Page Applications",
        detail:
          "Direct navigation or page refresh on sub-routes (e.g., `/settings` or `/dashboard`) returns 404 on static hosts without an SPA fallback rewrite rule.",
        fix: "Configure your hosting provider (Vercel, Cloudflare, Netlify) with a 200 rewrite rule pointing `/*` to `/index.html`.",
      },
      {
        title: "CORS Misconfigurations on Mock APIs",
        detail:
          "APIs that responded happily in the local iframe proxy fail when called across origins from the published production domain.",
        fix: "Configure Access-Control-Allow-Origin headers on all API endpoints or route requests through a reverse proxy.",
      },
    ],
    checklist: [
      "Test direct URL access and page refreshes on sub-pages (avoid SPA 404s)",
      "Audit network tab for 403/404/500 API responses and CORS errors",
      "Confirm all icons, SVG assets, and custom fonts load properly",
      "Verify mobile viewport meta tags exist and prevent accidental zooming",
      "Run PreLaunchQA to verify console error freedom across all primary pages",
    ],
  },
  cursor: {
    name: "Cursor AI",
    tagline: "Agentic Codebase Verification",
    description:
      "Cursor enables rapid refactoring and multi-file code generation. Because Cursor modifies existing codebases at scale, subtle regressions like broken prop types, deleted styles, or missing imports can remain hidden until real browser execution.",
    commonFailures: [
      {
        title: "Hydration Mismatches in SSR/SSG Frameworks",
        detail:
          "When building with Next.js, Remix, or TanStack Start, AI code accessing `window`, `localStorage`, or `new Date()` during initial render causes React hydration errors.",
        fix: "Wrap browser-only APIs in `useEffect` or check `typeof window !== 'undefined'` before accessing client state.",
      },
      {
        title: "Silent Broken Form Handlers",
        detail:
          "Form submission handlers refactored by AI that omit `e.preventDefault()`, causing unintended full-page reloads and lost form submissions.",
        fix: "Audit form submit listeners and verify that form validation errors render visibly on screen with appropriate ARIA roles.",
      },
      {
        title: "Unresolved NPM Dependencies or Asset Paths",
        detail:
          "AI hallucinations referencing nonexistent package versions or outdated asset paths that fail only in production builds.",
        fix: "Run automated build checks and inspect browser console logs for 404s on CSS and JS chunk files.",
      },
    ],
    checklist: [
      "Check for React hydration warning banners in console logs",
      "Test all forms (contact, signup, checkout) with empty and valid inputs",
      "Verify that client-side state persists correctly across route transitions",
      "Check DOM accessibility hygiene (labels on inputs, alt on images)",
      "Ensure SSL/HTTPS is active with zero mixed-content HTTP resource warnings",
    ],
  },
  v0: {
    name: "v0 by Vercel",
    tagline: "Component & UI Hygiene Guide",
    description:
      "v0 generates beautiful, accessible React and Tailwind components. When integrating v0 components into larger applications, styling conflicts, unlinked buttons, and mock data leaks need rigorous browser testing.",
    commonFailures: [
      {
        title: "Mock Data & Placeholder Content Leaks",
        detail:
          "v0 components come pre-populated with realistic mock emails, placeholder phone numbers, and placeholder links (`href=\"#\"`) that break user navigation.",
        fix: "Audit all anchor tags to replace `#` with genuine route paths and connect dynamic props to your backend.",
      },
      {
        title: "Tailwind CSS Class Clashes & Missing Variants",
        detail:
          "Components relying on Tailwind plugins (like typography or aspect-ratio) that are missing in your host project config, causing broken layouts.",
        fix: "Ensure your `tailwind.config.js` includes all required plugins and color palette tokens used in v0 output.",
      },
      {
        title: "Unbound Interactive Elements",
        detail:
          "Buttons and dropdown menus that visually look interactive but lack `onClick` or accessibility keyboard navigation hooks.",
        fix: "Verify keyboard tab navigation (focus rings) and attach functional event listeners to every actionable element.",
      },
    ],
    checklist: [
      "Replace all placeholder `#` links with real navigation URLs",
      "Test interactive dropdowns, accordions, and dialog modals",
      "Verify keyboard navigation and ARIA accessibility labels",
      "Confirm dark mode / light mode colors render with high contrast",
      "Run a PreLaunchQA scan to verify zero console warnings or layout bugs",
    ],
  },
};

function GuidesPage() {
  const [activePlatform, setActivePlatform] = useState<Platform>("lovable");
  const current = GUIDES[activePlatform];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-mint" />
            AI Developer Pre-Launch Playbook
          </p>
          <h1 className="mt-6 text-3xl font-bold sm:text-5xl">
            How to Test Your AI-Built App Before Launch
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            AI coding tools build full-stack apps in minutes. But shipping with silent console errors,
            broken routes, or unlinked forms costs you your first paying users. Here is what to check.
          </p>
        </div>

        {/* Builder Switcher Tabs */}
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {(Object.keys(GUIDES) as Platform[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActivePlatform(key)}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                activePlatform === key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {GUIDES[key].name} Guide
            </button>
          ))}
        </div>

        {/* Active Guide Content */}
        <article className="mt-10 rounded-3xl border border-border bg-card p-8 sm:p-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{current.name} Pre-Launch Checklist</h2>
              <p className="mt-1 text-sm text-primary font-medium">{current.tagline}</p>
            </div>
            <Link
              to="/auth"
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
            >
              Scan your {current.name} app free →
            </Link>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{current.description}</p>

          {/* Top Failure Modes */}
          <section className="mt-10">
            <h3 className="text-lg font-semibold text-foreground">Top 3 Silent Failure Modes in {current.name} Apps</h3>
            <div className="mt-4 space-y-4">
              {current.commonFailures.map((failure, idx) => (
                <div key={failure.title} className="rounded-2xl border border-border bg-background p-5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-coral/10 text-xs font-bold text-coral">
                      {idx + 1}
                    </span>
                    <h4 className="text-base font-semibold text-foreground">{failure.title}</h4>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{failure.detail}</p>
                  <div className="mt-3 rounded-lg border border-mint/30 bg-mint/5 p-3 text-xs text-mint">
                    <strong className="font-semibold">How to fix:</strong> {failure.fix}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Verification Checklist */}
          <section className="mt-10">
            <h3 className="text-lg font-semibold text-foreground">Pre-Launch Verification Checklist</h3>
            <ul className="mt-4 space-y-2.5">
              {current.checklist.map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3.5 text-sm">
                  <span className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full bg-mint/20 text-mint">
                    ✓
                  </span>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Automated Check CTA */}
          <div className="mt-12 rounded-2xl border border-primary/40 bg-primary/10 p-6 text-center sm:p-8">
            <h3 className="text-xl font-bold">Automate this entire audit in 30 seconds</h3>
            <p className="mx-auto mt-2 max-w-lg text-xs text-muted-foreground">
              Don't manually click every link or inspect every console tab. PreLaunchQA loads your {current.name} app in a real Chromium browser and gives you raw evidence of every issue.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link
                to="/auth"
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow transition hover:brightness-110"
              >
                Run Free Sample Check →
              </Link>
              <Link
                to="/preorder"
                className="rounded-xl border border-border bg-card px-5 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                View Plans ($49 / $99)
              </Link>
            </div>
          </div>
        </article>

        {/* Why Real-Browser Testing Matters Section */}
        <section className="mt-16 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Why Linter & Compiler Checks Aren't Enough</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            AI code often compiles with zero TypeScript errors. But in a real browser, third-party scripts fail to load, localStorage quota exceeds, or CSS layout glitches break user signups.
          </p>
          <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
            {[
              {
                title: "Real Browser Runtime",
                desc: "We run actual Chromium headless sessions. We catch runtime errors that static analyzers never see.",
              },
              {
                title: "Zero Code Access Needed",
                desc: "No GitHub tokens, no repository access, no privacy concerns. We test your app from the outside, exactly like a user.",
              },
              {
                title: "Before & After Diffs",
                desc: "Whenever you push changes or prompt your AI to fix a bug, our re-scan diff proves if the fix actually worked.",
              },
            ].map((box) => (
              <div key={box.title} className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground">{box.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{box.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
