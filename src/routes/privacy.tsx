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
    title: "What we collect: waitlist and pre-order",
    body: "If you join the list or pre-order, we store your email address, the app URL you entered, which builder you selected, whether you agreed to product emails, and a one-way fingerprint of your network address used solely to limit abuse of the form.",
  },
  {
    title: "What we collect: your account",
    body: "If you sign in with a magic link, we store your email address. If you use Continue with Google, we receive and store your email address, name and profile photo. Your sign-in session tokens are kept in your browser's local storage. Supabase Auth also records sign-in details such as IP address, browser user agent and sign-in times.",
  },
  {
    title: "What we collect: apps and checks",
    body: "When you add and verify an app, we store its URL, the builder you selected, and domain verification records (verification tokens and the results of verification attempts). When a check runs, we store the target URL, the check status and the findings observed during the check: console errors, failed network requests and DOM element snippets.",
  },
  {
    title: "What we collect: when you browse",
    body: "Cloudflare processes visitor IP addresses to serve and protect the site. We use Cloudflare Web Analytics to count page visits; it does not set cookies. Pages load fonts from Google Fonts (fonts.googleapis.com and fonts.gstatic.com), so your browser connects to Google's servers.",
  },
  {
    title: "Who can see it",
    body: "The signup list is not readable through the website by anyone, signed in or not. Only our server code can read it.",
  },
  {
    title: "When checks go live",
    body: "Running a check stores the page response, browser console errors, failed network requests, and DOM element snippets observed during the check. In future releases with interactive flow testing, test credentials will be encrypted at rest and deleted 24 hours after completion, and any recordings or screenshots will be kept for 30 days by default.",
  },
  {
    title: "Email",
    body: "We email you about your own checks. Marketing emails are only sent if you ticked the box, and every one has an unsubscribe link.",
  },
  {
    title: "Deleting your data",
    body: "To delete your account and personal data, or to ask a privacy question, email support@prelaunchqa.com from the email address you signed up with. Requests will be actioned within 30 days.",
  },
  {
    title: "Legal basis",
    body: "We process personal data to provide the service you signed up for, with your consent. You can withdraw consent and request deletion at any time by emailing support@prelaunchqa.com.",
  },
  {
    title: "Processors",
    body: "Supabase: database and authentication; our Supabase project is hosted in Mumbai, India. Cloudflare: hosting (Cloudflare Workers), DNS, Cloudflare Web Analytics, and DNS lookups for app ownership verification (cloudflare-dns.com); Cloudflare processes visitor IP addresses to serve and protect the site. Google: Continue with Google sign-in (email address, name and profile photo) and Google Fonts. Resend: account emails such as sign-up confirmation and sign-in links, sent from prelaunchqa.com.",
  },
];

function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl sm:text-4xl">Privacy policy</h1>
        <div className="mt-6 rounded-2xl border border-amber/40 bg-amber/10 p-5 text-sm text-amber">
          Draft. This policy must be reviewed before paid checks open.
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
