import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { supabase } from "@/integrations/supabase/client";
import {
  BUILT_WITH,
  addApp,
  deleteApp,
  listApps,
  verifyApp,
  type AppRow,
  type VerificationMethod,
} from "@/lib/apps.functions";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Your apps — PreLaunchQA" },
      {
        name: "description",
        content: "Add a web app and verify that you own it before any check is run.",
      },
      { property: "og:title", content: "Your apps — PreLaunchQA" },
      {
        property: "og:description",
        content: "Add an app and prove ownership by DNS record, meta tag or file.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const STATUS_STYLES: Record<AppRow["verification_status"], string> = {
  verified: "border-[hsl(var(--status-pass))]/40 bg-[hsl(var(--status-pass))]/10 text-[hsl(var(--status-pass))]",
  pending: "border-[hsl(var(--status-warn))]/40 bg-[hsl(var(--status-warn))]/10 text-[hsl(var(--status-warn))]",
  failed: "border-[hsl(var(--status-fail))]/40 bg-[hsl(var(--status-fail))]/10 text-[hsl(var(--status-fail))]",
};

const STATUS_LABEL: Record<AppRow["verification_status"], string> = {
  verified: "Verified",
  pending: "Pending",
  failed: "Not verified",
};

function StatusBadge({ status }: { status: AppRow["verification_status"] }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-stretch gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-border bg-background px-3 py-2 text-xs whitespace-pre">
          {value}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded-lg border border-border px-3 text-xs transition hover:bg-muted"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchApps = useServerFn(listApps);
  const createApp = useServerFn(addApp);
  const removeApp = useServerFn(deleteApp);
  const runVerify = useServerFn(verifyApp);

  const appsQuery = useQuery({ queryKey: ["apps"], queryFn: () => fetchApps() });

  const [url, setUrl] = useState("");
  const [builtWith, setBuiltWith] = useState<(typeof BUILT_WITH)[number]>("Lovable");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [openAppId, setOpenAppId] = useState<string | null>(null);
  const [method, setMethod] = useState<VerificationMethod>("meta");
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{ appId: string; ok: boolean; text: string } | null>(
    null,
  );

  const apps = appsQuery.data ?? [];

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    setAdding(true);
    setAddError(null);
    const result = await createApp({ data: { url, builtWith } });
    setAdding(false);
    if (!result.ok) {
      setAddError(result.error);
      return;
    }
    setUrl("");
    setOpenAppId(result.app.id);
    setMethod(result.app.managed_host ? "meta" : "dns");
    await queryClient.invalidateQueries({ queryKey: ["apps"] });
  }

  async function onVerify(app: AppRow) {
    setVerifying(true);
    setVerifyMessage(null);
    const result = await runVerify({ data: { appId: app.id, method } });
    setVerifying(false);
    setVerifyMessage({ appId: app.id, ok: result.ok, text: result.reason });
    await queryClient.invalidateQueries({ queryKey: ["apps"] });
  }

  async function signOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    void navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl sm:text-4xl">Your apps</h1>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Sign out
          </button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Add the app you want checked, then prove you own it. Nothing is ever fetched from an app
          you have not verified.
        </p>

        <section className="mt-10 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-lg">Add an app</h2>
          <form onSubmit={onAdd} className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourapp.com"
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <select
              value={builtWith}
              onChange={(e) => setBuiltWith(e.target.value as (typeof BUILT_WITH)[number])}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {BUILT_WITH.map((option) => (
                <option key={option} value={option}>
                  Built with {option}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={adding}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
            >
              {adding ? "Adding…" : "Add app"}
            </button>
          </form>
          {addError ? <p className="mt-3 text-sm text-destructive">{addError}</p> : null}
        </section>

        <section className="mt-10 space-y-4">
          {appsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : apps.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No apps yet. Add one above to get started.
            </p>
          ) : (
            apps.map((app) => {
              const isOpen = openAppId === app.id;
              const token = app.verification_token;
              return (
                <article key={app.id} className="rounded-3xl border border-border bg-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base">{app.host}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {app.built_with ? `Built with ${app.built_with}` : "Builder not set"}
                        {app.verified_at
                          ? ` · verified ${new Date(app.verified_at).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={app.verification_status} />
                      <button
                        type="button"
                        disabled
                        title="Available in Phase 2"
                        className="cursor-not-allowed rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground opacity-60"
                      >
                        Run check — Available in Phase 2
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenAppId(isOpen ? null : app.id);
                          setMethod(app.managed_host ? "meta" : "dns");
                          setVerifyMessage(null);
                        }}
                        className="rounded-lg border border-border px-3 py-2 text-xs transition hover:bg-muted"
                      >
                        {isOpen ? "Close" : app.verification_status === "verified" ? "Details" : "Verify"}
                      </button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="mt-6 space-y-5 border-t border-border pt-6">
                      <div className="flex flex-wrap gap-2">
                        {(["dns", "meta", "file"] as const)
                          .filter((option) => !(option === "dns" && app.managed_host))
                          .map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setMethod(option)}
                              className={`rounded-lg border px-3 py-2 text-xs transition ${
                                method === option
                                  ? "border-primary text-foreground"
                                  : "border-border text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {option === "dns"
                                ? "DNS record"
                                : option === "meta"
                                  ? "Meta tag"
                                  : "File upload"}
                            </button>
                          ))}
                      </div>

                      {app.managed_host ? (
                        <p className="text-xs text-muted-foreground">
                          DNS verification is unavailable on this hosting provider, so it is hidden.
                        </p>
                      ) : null}

                      {method === "dns" ? (
                        <div className="space-y-3">
                          <CopyField label="Record name" value={`_prelaunchqa.${app.host}`} />
                          <CopyField label="Record type" value="TXT" />
                          <CopyField label="Record value" value={`prelaunchqa-verify=${token}`} />
                          <p className="text-xs text-muted-foreground">
                            Add this TXT record with your domain provider. It can take a few minutes
                            to become visible.
                          </p>
                        </div>
                      ) : method === "meta" ? (
                        <div className="space-y-3">
                          <CopyField
                            label="Add this inside the <head> of your homepage"
                            value={`<meta name="prelaunchqa-verify" content="${token}">`}
                          />
                          <p className="text-xs text-muted-foreground">
                            Publish the change, then press Verify now.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <CopyField
                            label="File location"
                            value={`${app.origin}/.well-known/prelaunchqa.txt`}
                          />
                          <CopyField label="File contents" value={token} />
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onVerify(app)}
                          disabled={verifying}
                          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
                        >
                          {verifying ? "Checking…" : "Verify now"}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await removeApp({ data: { appId: app.id } });
                            await queryClient.invalidateQueries({ queryKey: ["apps"] });
                          }}
                          className="text-xs text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
                        >
                          Remove app
                        </button>
                      </div>

                      {verifyMessage && verifyMessage.appId === app.id ? (
                        <p
                          className={`text-sm ${
                            verifyMessage.ok
                              ? "text-[hsl(var(--status-pass))]"
                              : "text-[hsl(var(--status-fail))]"
                          }`}
                        >
                          {verifyMessage.text}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
