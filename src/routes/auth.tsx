import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — PreLaunchQA" },
      {
        name: "description",
        content: "Sign in to PreLaunchQA to add an app and verify that you own it.",
      },
      { property: "og:title", content: "Sign in — PreLaunchQA" },
      {
        property: "og:description",
        content: "Sign in to add an app and verify ownership before any check runs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) void navigate({ to: "/app" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) void navigate({ to: "/app" });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    setBusy(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setSent(true);
  }

  async function signInWithGoogle() {
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (oauthError) {
        setError(oauthError.message);
      }
    } catch (oauthError) {
      setError((oauthError as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-16 sm:py-24">
        <h1 className="text-3xl sm:text-4xl">Sign in</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Use a sign-in link sent to your email, or continue with Google. Accounts are only used to
          add apps and prove you own them.
        </p>

        <div className="mt-8 rounded-3xl border border-border bg-card p-6">
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
          >
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          {sent ? (
            <p className="text-sm text-muted-foreground">
              If an account can be created for{" "}
              <span className="text-foreground">{email.trim().toLowerCase()}</span>, a sign-in link
              is on its way. Open it on this device.
            </p>
          ) : (
            <form onSubmit={sendMagicLink} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-sm text-muted-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="you@company.com"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
              >
                {busy ? "Sending…" : "Email me a sign-in link"}
              </button>
            </form>
          )}

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
