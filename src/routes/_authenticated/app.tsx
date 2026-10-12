import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import {
  BILLING_PLANS,
  createCheckoutSession,
  getBillingOverview,
  type PlanKey,
} from "@/lib/billing.functions";
import { cancelScan, listScans, requestScan, type ScanRow } from "@/lib/scans.functions";

const ACTIVE_SCAN_STATUSES = ["queued", "claimed", "running"] as const;

function isActive(scan: ScanRow) {
  return (ACTIVE_SCAN_STATUSES as readonly string[]).includes(scan.status);
}

const SCAN_STATUS_LABEL: Record<ScanRow["status"], string> = {
  queued: "Waiting for a worker",
  claimed: "Picked up by a worker",
  running: "Running",
  completed: "Finished",
  failed: "Failed",
  cancelled: "Cancelled",
};

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
  verified: "border-mint/40 bg-mint/10 text-mint",
  pending: "border-amber/40 bg-amber/10 text-amber",
  failed: "border-coral/40 bg-coral/10 text-coral",
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
  const fetchScans = useServerFn(listScans);
  const startScan = useServerFn(requestScan);
  const stopScan = useServerFn(cancelScan);
  const fetchBilling = useServerFn(getBillingOverview);
  const checkoutFn = useServerFn(createCheckoutSession);

  const appsQuery = useQuery({ queryKey: ["apps"], queryFn: () => fetchApps() });
  const scansQuery = useQuery({
    queryKey: ["scans"],
    queryFn: () => fetchScans(),
    refetchInterval: (query) => ((query.state.data ?? []).some(isActive) ? 4000 : false),
  });
  const billingQuery = useQuery({ queryKey: ["billing"], queryFn: () => fetchBilling() });

  const [url, setUrl] = useState("");
  const [builtWith, setBuiltWith] = useState<(typeof BUILT_WITH)[number]>("Lovable");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [openAppId, setOpenAppId] = useState<string | null>(null);
  const [method, setMethod] = useState<VerificationMethod>("meta");
  const [verifying, setVerifying] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<{
    appId: string;
    ok: boolean;
    text: string;
  } | null>(null);
  const [scanMessage, setScanMessage] = useState<{ appId: string; text: string } | null>(null);

  const apps = appsQuery.data ?? [];
  const scans = scansQuery.data ?? [];
  const billing = billingQuery.data;

  async function onUpgrade(planId: "launch" | "retest") {
    setCheckingOut(planId);
    setCheckoutError(null);
    try {
      const res = await checkoutFn({ data: { planId } });
      if (res.ok) {
        if (res.url.startsWith("http")) {
          window.location.href = res.url;
        } else {
          await queryClient.invalidateQueries({ queryKey: ["billing"] });
          setShowBilling(false);
        }
      } else {
        setCheckoutError(res.error);
      }
    } catch (err: any) {
      setCheckoutError(err.message || "Failed to initiate checkout");
    } finally {
      setCheckingOut(null);
    }
  }

  async function onRunCheck(app: AppRow) {
    setScanMessage(null);
    const result = await startScan({ data: { appId: app.id } });
    if (!result.ok) setScanMessage({ appId: app.id, text: result.error });
    await queryClient.invalidateQueries({ queryKey: ["scans"] });
  }

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
          <div>
            <h1 className="text-3xl sm:text-4xl">Your apps</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-medium">
                <span className="size-2 rounded-full bg-mint"></span>
                Plan: {billing?.unlimitedScans ? "Unlimited Re-test" : billing?.plan === "launch" ? "Launch Pack" : "Free Sample"}
              </span>
              <span className="text-muted-foreground">
                {billing?.unlimitedScans
                  ? "Unlimited checks active"
                  : `${billing?.scanCredits ?? 1} check credit${(billing?.scanCredits ?? 1) === 1 ? "" : "s"} remaining`}
              </span>
              <button
                type="button"
                onClick={() => setShowBilling(true)}
                className="font-medium text-primary underline hover:brightness-110"
              >
                Upgrade / Buy checks →
              </button>
            </div>
          </div>
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
              const appScans = scans.filter((s) => s.app_id === app.id).slice(0, 5);
              const activeScan = appScans.find(isActive);
              const canScan = app.verification_status === "verified";
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
                      {activeScan ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await stopScan({ data: { scanId: activeScan.id } });
                            await queryClient.invalidateQueries({ queryKey: ["scans"] });
                          }}
                          disabled={activeScan.status !== "queued"}
                          title={
                            activeScan.status === "queued"
                              ? "Cancel this check"
                              : "A check already running cannot be cancelled"
                          }
                          className="rounded-lg border border-border px-3 py-2 text-xs transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancel check
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void onRunCheck(app)}
                          disabled={!canScan}
                          title={canScan ? "Queue a check" : "Verify this app first"}
                          className="rounded-lg border border-border px-3 py-2 text-xs transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Run check
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setOpenAppId(isOpen ? null : app.id);
                          setMethod(app.managed_host ? "meta" : "dns");
                          setVerifyMessage(null);
                        }}
                        className="rounded-lg border border-border px-3 py-2 text-xs transition hover:bg-muted"
                      >
                        {isOpen
                          ? "Close"
                          : app.verification_status === "verified"
                            ? "Details"
                            : "Verify"}
                      </button>
                    </div>
                  </div>

                  {scanMessage && scanMessage.appId === app.id ? (
                    <p className="mt-3 text-xs text-destructive">{scanMessage.text}</p>
                  ) : null}

                  {appScans.length > 0 ? (
                    <ul className="mt-4 space-y-2 border-t border-border pt-4">
                      {appScans.map((scan) => (
                        <li
                          key={scan.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
                        >
                          <span>
                            {new Date(scan.created_at).toLocaleString()} ·{" "}
                            {SCAN_STATUS_LABEL[scan.status]}
                            {scan.progress_message ? ` — ${scan.progress_message}` : ""}
                          </span>
                          <span className="flex items-center gap-3">
                            <span>
                              {scan.status === "completed"
                                ? `${scan.bug_count} bugs · ${scan.needs_review_count} to review · ${scan.passed_count} passed`
                                : scan.status === "failed" && scan.error
                                  ? scan.error
                                  : isActive(scan)
                                    ? `${scan.progress}%`
                                    : ""}
                            </span>
                            <Link
                              to="/report/$scanId"
                              params={{ scanId: scan.id }}
                              className="rounded-lg border border-border px-2 py-1 transition hover:bg-muted"
                            >
                              View report
                            </Link>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

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
                        <p className={`text-sm ${verifyMessage.ok ? "text-mint" : "text-coral"}`}>
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

        {/* Billing & Upgrade Modal */}
        {showBilling && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Choose a check plan</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Get more check credits or unlock continuous re-test monitoring.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBilling(false)}
                  className="rounded-lg border border-border p-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              {checkoutError && (
                <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {checkoutError}
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {/* Launch Check Pack */}
                <div className="flex flex-col justify-between rounded-2xl border border-border bg-background p-6">
                  <div>
                    <span className="inline-block rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      Most Popular
                    </span>
                    <h3 className="mt-2 text-xl font-bold">{BILLING_PLANS.launch.name}</h3>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {BILLING_PLANS.launch.priceDisplay}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {BILLING_PLANS.launch.description}
                    </p>
                    <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                      {BILLING_PLANS.launch.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-mint"></span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={checkingOut !== null}
                    onClick={() => onUpgrade("launch")}
                    className="mt-6 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
                  >
                    {checkingOut === "launch" ? "Preparing checkout..." : "Buy 5 Checks ($49)"}
                  </button>
                </div>

                {/* Monthly Re-test Plan */}
                <div className="flex flex-col justify-between rounded-2xl border border-primary/40 bg-primary/5 p-6">
                  <div>
                    <span className="inline-block rounded-full bg-mint/20 px-2.5 py-0.5 text-xs font-semibold text-mint">
                      Continuous QA
                    </span>
                    <h3 className="mt-2 text-xl font-bold">{BILLING_PLANS.retest.name}</h3>
                    <p className="mt-2 text-2xl font-bold text-primary">
                      {BILLING_PLANS.retest.priceDisplay}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {BILLING_PLANS.retest.description}
                    </p>
                    <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                      {BILLING_PLANS.retest.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-primary"></span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={checkingOut !== null}
                    onClick={() => onUpgrade("retest")}
                    className="mt-6 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
                  >
                    {checkingOut === "retest" ? "Preparing checkout..." : "Subscribe ($99/mo)"}
                  </button>
                </div>
              </div>

              <div className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground">
                <p>
                  Secure checkout powered by Stripe. 7-day money-back satisfaction guarantee.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
