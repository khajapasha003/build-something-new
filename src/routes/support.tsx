import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import {
  submitSupportTicket,
  TICKET_CATEGORIES,
  type TicketCategory,
} from "@/lib/support.functions";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support & Help — PreLaunchQA" },
      {
        name: "description",
        content:
          "Need help with domain verification, automated browser checks, or billing? Contact the PreLaunchQA team.",
      },
      { property: "og:title", content: "Support & Help — PreLaunchQA" },
      {
        property: "og:description",
        content: "Direct support and FAQ for PreLaunchQA automated app checking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupportPage,
});

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  general: "General Inquiry",
  verification: "Domain Verification Issue",
  scan_issue: "Scan Report or Findings Question",
  billing: "Billing, Credits & Invoices",
  feature_request: "Feature Request / Feedback",
};

const FAQ_ITEMS = [
  {
    q: "How long does domain ownership verification take?",
    a: "Meta tag and file verifications are validated immediately (under 3 seconds). DNS TXT record propagation depends on your DNS provider, typically taking between 2 to 30 minutes. You can retry up to 10 times per hour.",
  },
  {
    q: "What does the browser scan actually test?",
    a: "Our worker spins up an isolated Chromium browser instance, visits your target URL, waits for network idle, and inspects console errors, failed network calls, broken links, image alt attributes, form label accessibility, mixed content, and responsive layout.",
  },
  {
    q: "Are credentials or private customer data stored?",
    a: "Never. Current checks only run on public entry points. When authenticated test flows are enabled, credentials are kept in an encrypted ephemeral vault and permanently purged 24 hours after check completion.",
  },
  {
    q: "How does the re-scan comparison diff work?",
    a: "When you re-run a check on an app, our comparison engine correlates rule IDs and page paths against your previous completed run, highlighting newly fixed issues, brand-new defects, and persistent bugs.",
  },
];

function SupportPage() {
  const submitTicket = useServerFn(submitSupportTicket);

  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("general");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await submitTicket({
        data: {
          email,
          subject,
          category,
          message,
        },
      });

      if (res.ok) {
        setSuccessMessage(res.message);
        setSubject("");
        setMessage("");
      } else {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-6 py-16">
        <header className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-mint"></span>
            Help & Customer Support
          </p>
          <h1 className="mt-4 text-3xl font-bold sm:text-5xl">How can we help?</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Have a question about your check results, domain verification, or billing? Reach out
            below or write directly to{" "}
            <a
              href="mailto:support@prelaunchqa.com"
              className="text-primary underline hover:brightness-110"
            >
              support@prelaunchqa.com
            </a>
            .
          </p>
        </header>

        <div className="mt-12 grid gap-12 lg:grid-cols-5">
          {/* Support Ticket Form */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <h2 className="text-xl font-semibold">Send a message</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We review every inquiry and reply within 24 hours.
              </p>

              {successMessage ? (
                <div className="mt-6 rounded-2xl border border-mint/40 bg-mint/10 p-6 text-sm text-mint">
                  <p className="font-semibold">Message sent successfully!</p>
                  <p className="mt-2 text-muted-foreground">{successMessage}</p>
                  <button
                    type="button"
                    onClick={() => setSuccessMessage(null)}
                    className="mt-4 rounded-lg bg-mint/20 px-4 py-2 text-xs font-medium text-mint transition hover:bg-mint/30"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {errorMessage && (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                      {errorMessage}
                    </div>
                  )}

                  <label className="block text-sm">
                    <span className="mb-1.5 block text-muted-foreground">Your Email</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-xl border border-input bg-secondary/60 px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring/40"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1.5 block text-muted-foreground">Category</span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as TicketCategory)}
                      className="w-full rounded-xl border border-input bg-secondary/60 px-4 py-3 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
                    >
                      {TICKET_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-card">
                          {CATEGORY_LABELS[cat]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1.5 block text-muted-foreground">Subject</span>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief summary of your question"
                      className="w-full rounded-xl border border-input bg-secondary/60 px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring/40"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1.5 block text-muted-foreground">Message</span>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe what you observed, your app URL, or what you need help with..."
                      className="w-full rounded-xl border border-input bg-secondary/60 px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring/40"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-primary px-6 py-3 font-display font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
                  >
                    {loading ? "Sending..." : "Submit ticket"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Direct Support Card & Tips */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-3xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold">Priority Support</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Active subscribers and Launch Check customers receive priority response handling
                directly from engineering.
              </p>
              <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
                <p>
                  <strong>Direct Email:</strong>{" "}
                  <a href="mailto:support@prelaunchqa.com" className="text-primary">
                    support@prelaunchqa.com
                  </a>
                </p>
                <p className="mt-1">
                  <strong>Operating Hours:</strong> 24/7 ticket intake, Mon–Fri response window
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-mint/30 bg-mint/5 p-6">
              <h3 className="text-lg font-semibold text-mint">Check Status First</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Suspect a queue delay or API degradation? View real-time status across our worker
                fleet and edge endpoints on our public status page.
              </p>
              <a
                href="/status"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-mint underline hover:brightness-125"
              >
                View Live System Status →
              </a>
            </div>
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold">Frequently asked questions</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q} className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold">{item.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
