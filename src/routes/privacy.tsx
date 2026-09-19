import { createFileRoute } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy — PreLaunchQA" },
      {
        name: "description",
        content:
          "What PreLaunchQA stores when you join the list or run a check, how long recordings and test credentials are kept, and how to have your data deleted.",
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
    title: "What we collect right now",
    body: "If you join the list or pre-order, we store your email address, the app URL you entered, which builder you selected, whether you agreed to product emails, and a one-way fingerprint of your network address used solely to limit abuse of the form. Nothing else.",
  },
  {
    title: "Who can see it",
    body: "The signup list is not readable through the website by anyone, signed in or not. Only our server code can read it.",
  },
  {
    title: "When checks go live",
    body: "Running a check additionally stores the pages we visited, screenshots, screen recordings and browser traces of the flows we walked through. Test credentials you supply are encrypted at rest and deleted 24 hours after the check finishes. Recordings are kept for 30 days by default.",
  },
  {
    title: "Email",
    body: "We email you about your own checks. Marketing emails are only sent if you ticked the box, and every one has an unsubscribe link.",
  },
  {
    title: "Deleting your data",
    body: "PLACEHOLDER — the contact address for deletion and data-export requests is not set yet. Once set, requests will be actioned within 30 days.",
  },
  {
    title: "Processors and legal basis",
    body: "PLACEHOLDER — the list of sub-processors, data locations, and the legal basis under applicable data protection law must be completed and reviewed before launch.",
  },
];

function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl sm:text-4xl">Privacy policy</h1>
        <div className="mt-6 rounded-2xl border border-amber/40 bg-amber/10 p-5 text-sm text-amber">
          Draft. Sections marked PLACEHOLDER are not written yet. This policy must be reviewed
          before paid checks open.
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
