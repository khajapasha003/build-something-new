import { createFileRoute } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of service — PreLaunchQA" },
      {
        name: "description",
        content:
          "The terms that apply when you use PreLaunchQA to test a web app you own, including authorisation, scope limits and refunds.",
      },
      { property: "og:title", content: "Terms of service — PreLaunchQA" },
      {
        property: "og:description",
        content: "Authorisation, scope limits, liability and refunds for PreLaunchQA checks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Terms,
});

const sections = [
  {
    title: "1. Who may run a check",
    body: "You may only request a check for a web app you own or are authorised in writing to test. We verify ownership by DNS record or meta tag before any check runs. Requesting a check for someone else's app without permission is a breach of these terms and we will refuse or stop the check.",
  },
  {
    title: "2. What a check covers",
    body: "Checks are currently limited to loading your homepage in a real browser and observing console errors, network requests, dead links, and document hygiene. We do not attempt attacks, we do not fuzz, and we do not attempt to defeat access controls. Interactive user flow testing (forms, auth, and test checkouts) will only run when explicitly configured in future releases.",
  },
  {
    title: "3. What a check does not mean",
    body: "A report is a record of what we observed at a point in time. It is not a certification, an audit, a guarantee of security, or a statement that your app is free of defects. You remain responsible for your own testing and release decisions.",
  },
  {
    title: "4. Your data and future credentials",
    body: "Current checks only record raw browser session observations (console logs, failing URLs, and HTML element snippets). When future releases support interactive flow testing with test credentials, credentials will be stored encrypted and deleted 24 hours after completion. Screenshots and recordings will be retained for 30 days unless deleted sooner.",
  },
  {
    title: "5. Payment and refunds",
    body: "PLACEHOLDER — payment terms, currency, tax handling and the refund window will be filled in before paid checkout opens. Do not treat this section as final.",
  },
  {
    title: "6. Liability",
    body: "PLACEHOLDER — liability limits must be reviewed by a qualified lawyer in your jurisdiction before launch.",
  },
  {
    title: "7. Governing law and contact",
    body: "PLACEHOLDER — governing law, registered business name, business address and contact email are not yet set.",
  },
];

function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl sm:text-4xl">Terms of service</h1>
        <div className="mt-6 rounded-2xl border border-amber/40 bg-amber/10 p-5 text-sm text-amber">
          Draft. Sections marked PLACEHOLDER are not written yet and are not legally binding. These
          terms must be reviewed by a lawyer before paid checks open.
        </div>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl">{section.title}</h2>
              <p className="mt-3 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
