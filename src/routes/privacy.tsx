import { createFileRoute } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy — PreLaunchQA" },
      {
        name: "description",
        content:
          "What PreLaunchQA stores when you join the list, run a check or subscribe, how long recordings and test credentials are kept, and how to have your data deleted.",
      },
      { property: "og:title", content: "Privacy policy — PreLaunchQA" },
      {
        property: "og:description",
        content: "What we store, how long we keep it, and how to have it deleted.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Privacy,
});

const sections = [
  {
    title: "1. What we collect: waitlist and pre-order",
    body: "If you join the list or pre-order, we store your email address, the app URL you entered, which builder you selected, whether you agreed to product updates, and a cryptographic one-way HMAC hash of your IP address used solely for rate limiting to prevent form abuse. Raw IP addresses are never persisted in the database.",
  },
  {
    title: "2. What we collect: your account",
    body: "If you sign in with an email magic link, we store your email address. If you use Continue with Google, we receive and store your email address, name and profile photo. Your sign-in session tokens are stored in your browser's local storage. Supabase Auth records sign-in metadata such as browser user agent and authentication timestamps.",
  },
  {
    title: "3. What we collect: apps and checks",
    body: "When you add and verify an app, we store its origin URL, builder category, and verification proof records (DNS TXT, meta tag, or file check logs). When an automated browser check runs, we store the target URL, check lifecycle status, and findings observed during execution: browser console errors, failed HTTP request URLs, image accessibility attributes, and element DOM snippets.",
  },
  {
    title: "4. Billing, payment data, and Stripe",
    body: "When you purchase Launch Checks or subscribe to the Monthly Re-test plan, payment processing is handled directly by Stripe. PreLaunchQA never receives or stores your full credit card number, CVV, or banking details. We receive only transaction identifiers, customer IDs, and subscription status tokens required to fulfill and manage your account entitlements.",
  },
  {
    title: "5. Data retention and ephemeral credentials",
    body: "Public check findings and screenshot evidence are retained for 30 calendar days to enable before/after re-scan comparisons, after which they are deleted. When future releases support authenticated test flows with user-provided test credentials, those credentials will be encrypted at rest with AES-GCM and completely purged within 24 hours of check completion.",
  },
  {
    title: "6. When you browse",
    body: "Cloudflare terminates SSL, serves cached assets, and mitigates DDoS threats. We use privacy-preserving Cloudflare Web Analytics to measure site visits without setting tracking cookies. Fonts are served from Google Fonts (fonts.googleapis.com and fonts.gstatic.com).",
  },
  {
    title: "7. Who can see your data",
    body: "Your apps, verification tokens, and scan findings are protected by Postgres Row Level Security (RLS) and are only accessible by you when authenticated. Neither public visitors nor other users can view your apps or reports.",
  },
  {
    title: "8. Communications and unsubscribing",
    body: "We only send transactional emails relating to your checks, account security, and billing receipts. Marketing updates are strictly opt-in and include a single-click unsubscribe link at the bottom of every message.",
  },
  {
    title: "9. Deleting your data and privacy rights",
    body: "Under GDPR, CCPA, and DPDP, you have the right to access, rectify, export, or permanently delete your personal information. To request complete deletion of your account, apps, and scan history, email support@prelaunchqa.com from your registered address. Deletion requests are fulfilled within 30 days.",
  },
  {
    title: "10. Sub-processors",
    body: "We partner with trusted service providers: Supabase (database, auth, and storage, Mumbai ap-south-1), Cloudflare (global edge network, Workers hosting, and DNS), Stripe (PCI-compliant payment processing), Google (OAuth authentication), and Resend (transactional email delivery).",
  },
];

function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-bold">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last revised: October 2026. Clear, honest data practices with zero third-party ad tracking.
        </p>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
