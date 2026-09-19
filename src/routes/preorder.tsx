import { createFileRoute } from "@tanstack/react-router";

import { SignupForm } from "@/components/SignupForm";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const Route = createFileRoute("/preorder")({
  head: () => ({
    meta: [
      { title: "Pre-order a launch check — PreLaunchQA" },
      {
        name: "description",
        content:
          "Reserve a PreLaunchQA launch check for your web app. We confirm scope and price by email before anything is charged.",
      },
      { property: "og:title", content: "Pre-order a launch check — PreLaunchQA" },
      {
        property: "og:description",
        content:
          "Reserve a launch check for your web app. Scope and price confirmed by email before any charge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Preorder,
});

function Preorder() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <h1 className="text-3xl sm:text-5xl">Pre-order a launch check</h1>
        <p className="mt-5 text-muted-foreground">
          Paid checkout is not open yet. Leave your details and we will contact you with the scope,
          the price and the start date. Nothing is charged until you reply and agree.
        </p>

        <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            We verify you own the app before anything is tested.
          </li>
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            Test credentials are encrypted and deleted 24 hours after a check.
          </li>
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            Recordings are kept for 30 days by default, then removed.
          </li>
        </ul>

        <div className="mt-10 rounded-3xl border border-border bg-card p-6 sm:p-8">
          <SignupForm
            intent="preorder"
            submitLabel="Reserve my check"
            successMessage="We have your request. Expect an email with scope, price and timing."
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
