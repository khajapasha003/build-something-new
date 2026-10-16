import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";

import { BUILDERS, submitSignup } from "@/lib/waitlist.functions";

type Props = {
  intent: "waitlist" | "preorder";
  submitLabel: string;
  successMessage: string;
};

export function SignupForm({ intent, submitLabel, successMessage }: Props) {
  const signup = useServerFn(submitSignup);
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("saving");
    setError(null);

    try {
      const result = await signup({
        data: {
          email: String(form.get("email") ?? ""),
          websiteUrl: String(form.get("websiteUrl") ?? ""),
          builder: String(form.get("builder") ?? "Other") as (typeof BUILDERS)[number],
          consentMarketing: form.get("consentMarketing") === "on",
          intent,
        },
      });

      if (result.ok) {
        setStatus("done");
      } else {
        setStatus("idle");
        setError(result.error);
      }
    } catch {
      setStatus("idle");
      setError("Check the email and URL, then try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-mint/40 bg-mint/10 p-6">
        <p className="font-display text-lg text-mint">You're on the list</p>
        <p className="mt-2 text-sm text-muted-foreground">{successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted-foreground">Email</span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="w-full rounded-xl border border-input bg-secondary/60 px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted-foreground">Your app URL</span>
          <input
            required
            type="url"
            name="websiteUrl"
            placeholder="https://yourapp.com"
            className="w-full rounded-xl border border-input bg-secondary/60 px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block text-muted-foreground">Built with</span>
        <select
          name="builder"
          defaultValue="Next.js"
          className="w-full rounded-xl border border-input bg-secondary/60 px-4 py-3 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
        >
          {BUILDERS.map((builder) => (
            <option key={builder} value={builder} className="bg-card">
              {builder}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="consentMarketing"
          className="mt-1 size-4 rounded border-input bg-secondary accent-[oklch(0.636_0.211_295)]"
        />
        <span>Email me product updates. You can unsubscribe at any time.</span>
      </label>

      {error ? <p className="text-sm text-coral">{error}</p> : null}

      <button
        type="submit"
        disabled={status === "saving"}
        className="w-full rounded-xl bg-primary px-6 py-3 font-display font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
      >
        {status === "saving" ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
