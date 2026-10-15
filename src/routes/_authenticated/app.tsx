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
} from "@/lib/billing.functions";
import { cancelScan, listScans, requestScan, type ScanRow } from "@/lib/scans.functions";

const ACTIVE_SCAN_STATUSES = ["queued", "claimed", "running"] as const;

function isActive(scan: ScanRow) {
  return (ACTIVE_SCAN_STATUSES as readonly string[]).includes(scan.status);
}

const SCAN_STATUS_LABEL: Record<ScanRow["status"], string> = {
  queued: "Waiting for worker",
  claimed: "Worker assigned",
  running: "Chromium inspecting page",
  completed: "Audit complete",
  failed: "Audit failed",
  cancelled: "Cancelled",
};

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Dashboard — PreLaunchQA" },
      {
        name: "description",
        content: "Add a web app and verify that you own it before automated browser checks run.",
      },
      { property: "og:title", content: "Dashboard — PreLaunchQA" },
      {
        property: "og:description",
        content: "Interactive browser QA dashboard for AI-built web applications.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const STATUS_STYLES: Record<AppRow["verification_status"], { pill: string; dot: string; label: string }> = {
  verified: {
    pill: "border-mint/40 bg-mint/10 text-mint",
    dot: "bg-mint shadow-sm shadow-mint/40",
    label: "Verified & Protected",
  },
  pending: {
    pill: "border-amber/40 bg-amber/10 text-amber",
    dot: "bg-amber shadow-sm shadow-amber/40",
    label: "Pending Verification",
  },
  failed: {
    pill: "border-coral/40 bg-coral/10 text-coral",
    dot: "bg-coral shadow-sm shadow-coral/40",
    label: "Not Verified",
  },
};

const PLATFORM_BADGES: Record<string, { label: string; badgeClass: string }> = {
  Lovable: { label: "Lovable", badgeClass: "border-purple-500/30 bg-purple-500/10 text-purple-300" },
  Bolt: { label: "Bolt.new", badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  Cursor: { label: "Cursor", badgeClass: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" },
  v0: { label: "v0 / Next", badgeClass: "border-zinc-400/30 bg-zinc-400/10 text-zinc-200" },
  Windsurf: { label: "Windsurf", badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  Other: { label: "Web App", badgeClass: "border-slate-500/30 bg-slate-500/10 text-slate-300" },
};

function StatusBadge({ status }: { status: AppRow["verification_status"] }) {
  const meta = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.pill}`}>
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex items-stretch gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 font-mono text-xs text-foreground/90 whitespace-pre">
          {value}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className={`shrink-0 rounded-xl border px-3.5 text-xs font-semibold transition ${
            copied
              ? "border-mint/50 bg-mint/15 text-mint"
              : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          {copied ? "Copied ✓" : "Copy"}
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
    refetchInterval: (query) => ((query.state.data ?? []).some(isActive) ? 3000 : false),
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

  // Derived Analytics Metrics for Psychology & Visualization
  const totalApps = apps.length;
  const verifiedApps = apps.filter((a) => a.verification_status === "verified").length;
  const completedScans = scans.filter((s) => s.status === "completed");
  const activeScans = scans.filter(isActive);
  const totalBugsCaught = completedScans.reduce((sum, s) => sum + (s.bug_count || 0), 0);
  const totalPassedChecks = completedScans.reduce((sum, s) => sum + (s.passed_count || 0), 0);
  const totalCheckPoints = totalBugsCaught + totalPassedChecks;
  const cleanPassRate = totalCheckPoints > 0 ? Math.round((totalPassedChecks / totalCheckPoints) * 100) : 100;

  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "paypal" | "razorpay">("stripe");

  async function onUpgrade(planId: "launch" | "retest") {
    setCheckingOut(planId);
    setCheckoutError(null);
    try {
      const res = await checkoutFn({ data: { planId, provider: paymentProvider } });
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
    if (!billing?.unlimitedScans && (billing?.scanCredits ?? 1) <= 0) {
      setShowBilling(true);
      return;
    }
    const result = await startScan({ data: { appId: app.id } });
    if (!result.ok) {
      if (result.error.includes("NO_CREDITS")) {
        setShowBilling(true);
      }
      setScanMessage({ appId: app.id, text: result.error });
    }
    await queryClient.invalidateQueries({ queryKey: ["scans"] });
    await queryClient.invalidateQueries({ queryKey: ["billing"] });
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

      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        {/* Top Header & Quick Profile Info */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                QA Dashboard
              </h1>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Chromium Engine v1.0
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Automated real-browser audits for console errors, dead links, and silent runtime crashes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowBilling(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-primary to-indigo-600 px-4 py-2 font-display text-xs font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:brightness-110 active:scale-95"
            >
              <span>⚡ Buy Check Credits</span>
            </button>
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-border bg-card/60 px-3.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-card hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Dynamic Metric KPI Visualization Cards */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Connected Apps */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-5 backdrop-blur transition-all hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Monitored Apps</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold">{totalApps}</span>
              <span className="text-xs text-muted-foreground">
                ({verifiedApps} verified)
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-blue-400" />
              <span>Full real-browser coverage</span>
            </div>
          </div>

          {/* Card 2: Quality Pass Rate */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-5 backdrop-blur transition-all hover:border-mint/40 hover:shadow-lg hover:shadow-mint/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Clean Pass Rate</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-mint/10 text-mint">
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-mint">{cleanPassRate}%</span>
              <span className="text-xs text-muted-foreground">healthy checks</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-mint" />
              <span>{totalPassedChecks} passed verification items</span>
            </div>
          </div>

          {/* Card 3: Bugs Caught */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-5 backdrop-blur transition-all hover:border-coral/40 hover:shadow-lg hover:shadow-coral/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Bugs Prevented</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-coral/10 text-coral">
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-coral">{totalBugsCaught}</span>
              <span className="text-xs text-muted-foreground">issues logged</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-coral" />
              <span>Stopped before users saw them</span>
            </div>
          </div>

          {/* Card 4: Credits & Plan */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-5 backdrop-blur transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Check Credits</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-foreground">
                {billing?.unlimitedScans ? "Unlimited" : (billing?.scanCredits ?? 1)}
              </span>
              <span className="text-xs text-muted-foreground">
                {billing?.unlimitedScans ? "Monthly Plan" : "remaining"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                {billing?.unlimitedScans ? "Active Continuous QA" : "1 Credit = 1 Full Audit"}
              </span>
              <button
                type="button"
                onClick={() => setShowBilling(true)}
                className="font-semibold text-primary underline hover:text-primary/80"
              >
                Top up
              </button>
            </div>
          </div>
        </section>

        {/* Real-Time Live Worker Scan Activity Panel (When a check is active) */}
        {activeScans.length > 0 && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card/90 to-background p-6 shadow-xl shadow-primary/5">
            {activeScans.map((activeScan) => {
              const appForScan = apps.find((a) => a.id === activeScan.app_id);
              return (
                <div key={activeScan.id} className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="relative flex size-3">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex size-3 rounded-full bg-emerald-500"></span>
                      </span>
                      <div>
                        <h3 className="font-display text-base font-semibold text-foreground">
                          Live Chromium Inspection in Progress
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Auditing <span className="font-mono text-foreground font-semibold">{appForScan?.host || "web application"}</span> in a clean headless browser
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                        {SCAN_STATUS_LABEL[activeScan.status]}
                      </span>
                      {activeScan.status === "queued" && (
                        <button
                          type="button"
                          onClick={async () => {
                            await stopScan({ data: { scanId: activeScan.id } });
                            await queryClient.invalidateQueries({ queryKey: ["scans"] });
                          }}
                          className="rounded-xl border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Animated Progress Pipeline */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-mono">
                        {activeScan.progress_message || "Inspecting DOM tree and network requests..."}
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {activeScan.progress || 25}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-background/80">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-mint transition-all duration-500 animate-pulse"
                        style={{ width: `${Math.max(activeScan.progress || 25, 10)}%` }}
                      />
                    </div>
                  </div>

                  {/* Step breadcrumbs */}
                  <div className="grid grid-cols-4 gap-2 pt-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-mint font-medium">
                      <span>✓</span> <span>1. Queue Claimed</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${["claimed", "running"].includes(activeScan.status) ? "text-mint font-medium" : "text-muted-foreground"}`}>
                      <span>{["claimed", "running"].includes(activeScan.status) ? "✓" : "○"}</span> <span>2. Chromium Launch</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${activeScan.status === "running" ? "text-blue-400 font-medium animate-pulse" : "text-muted-foreground"}`}>
                      <span>{activeScan.status === "running" ? "▶" : "○"}</span> <span>3. Network & Console</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span>○</span> <span>4. Generate Evidence</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Low Credit Warning Banner */}
        {!billing?.unlimitedScans && (billing?.scanCredits ?? 1) <= 0 && (
          <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-amber/40 bg-gradient-to-r from-amber/15 via-amber/5 to-transparent p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-sm font-bold text-amber">
                  You have used your free sample check credit.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upgrade to Launch Check ($49 for 5 deep checks + re-scan comparison) or Monthly
                  Re-test ($99/mo) to continue verifying your apps.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBilling(true)}
              className="shrink-0 rounded-xl bg-gradient-to-r from-amber to-orange-500 px-5 py-2.5 font-display text-xs font-bold text-black shadow-lg shadow-amber/20 transition hover:brightness-110 active:scale-95"
            >
              Get More Checks →
            </button>
          </div>
        )}

        {/* Add an App Section */}
        <section className="mt-8 rounded-3xl border border-border/80 bg-card/60 p-6 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold">Connect a new Web App</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Enter your live or staging domain. Ownership is verified via DNS, Meta Tag, or file before any check executes.
              </p>
            </div>
            <span className="text-xs text-muted-foreground/80">🔒 Zero source code access needed</span>
          </div>

          <form onSubmit={onAdd} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://mycoolapp.com or staging.mycoolapp.com"
                className="w-full rounded-xl border border-border/80 bg-background/90 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              value={builtWith}
              onChange={(e) => setBuiltWith(e.target.value as (typeof BUILT_WITH)[number])}
              className="rounded-xl border border-border/80 bg-background/90 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
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
              className="rounded-xl bg-gradient-to-r from-violet-600 to-primary px-6 py-3 font-display text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:opacity-60 active:scale-95"
            >
              {adding ? "Registering…" : "Add Web App"}
            </button>
          </form>
          {addError && <p className="mt-3 text-xs font-medium text-coral">{addError}</p>}
        </section>

        {/* Your Monitored Apps Grid */}
        <section className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Your Apps ({apps.length})</h2>
            <span className="text-xs text-muted-foreground">Click details to view verification & logs</span>
          </div>

          {appsQuery.isLoading ? (
            <div className="rounded-3xl border border-border/60 bg-card/40 p-12 text-center text-sm text-muted-foreground">
              <span className="inline-block animate-spin mr-2">⟳</span> Loading your applications…
            </div>
          ) : apps.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/80 bg-card/30 p-12 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <h3 className="mt-4 font-display text-base font-semibold">No web apps added yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                Add your Lovable, Bolt, Cursor, or v0 web app above to run your first automated Chromium browser audit.
              </p>
            </div>
          ) : (
            apps.map((app) => {
              const isOpen = openAppId === app.id;
              const token = app.verification_token;
              const appScans = scans.filter((s) => s.app_id === app.id).slice(0, 5);
              const activeScan = appScans.find(isActive);
              const canScan = app.verification_status === "verified";
              const platform = PLATFORM_BADGES[app.built_with || "Other"] || PLATFORM_BADGES.Other;

              return (
                <article
                  key={app.id}
                  className="rounded-3xl border border-border/80 bg-card/60 p-6 backdrop-blur transition-all hover:border-border"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/60 shadow-inner">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {app.host.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-display text-base font-bold text-foreground">
                            {app.host}
                          </p>
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${platform.badgeClass}`}>
                            {platform.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {app.origin}
                          {app.verified_at
                            ? ` · Verified on ${new Date(app.verified_at).toLocaleDateString()}`
                            : " · Verification pending"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <StatusBadge status={app.verification_status} />

                      {activeScan ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await stopScan({ data: { scanId: activeScan.id } });
                            await queryClient.invalidateQueries({ queryKey: ["scans"] });
                          }}
                          disabled={activeScan.status !== "queued"}
                          className="rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-50"
                        >
                          Cancel check
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void onRunCheck(app)}
                          disabled={!canScan}
                          title={canScan ? "Queue a Chromium check" : "Verify domain ownership first"}
                          className={`rounded-xl px-4 py-2 font-display text-xs font-semibold transition active:scale-95 ${
                            canScan
                              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md shadow-emerald-500/20 hover:brightness-110"
                              : "border border-border/80 bg-muted/40 text-muted-foreground cursor-not-allowed opacity-60"
                          }`}
                        >
                          Run Chromium Check
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setOpenAppId(isOpen ? null : app.id);
                          setMethod(app.managed_host ? "meta" : "dns");
                          setVerifyMessage(null);
                        }}
                        className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        {isOpen
                          ? "Hide Details"
                          : app.verification_status === "verified"
                            ? "Audit History"
                            : "Verify Domain"}
                      </button>
                    </div>
                  </div>

                  {scanMessage && scanMessage.appId === app.id && (
                    <div className="mt-3 rounded-xl border border-coral/40 bg-coral/10 p-3 text-xs text-coral">
                      {scanMessage.text}
                    </div>
                  )}

                  {/* Audit Runs History Table */}
                  {appScans.length > 0 && (
                    <div className="mt-5 border-t border-border/60 pt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Recent Audit Reports
                      </p>
                      <ul className="mt-2.5 divide-y divide-border/40">
                        {appScans.map((scan) => (
                          <li
                            key={scan.id}
                            className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                          >
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span className="font-mono text-[11px]">
                                {new Date(scan.created_at).toLocaleDateString()} {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span>·</span>
                              <span className="font-medium text-foreground">
                                {SCAN_STATUS_LABEL[scan.status]}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              {scan.status === "completed" ? (
                                <div className="flex items-center gap-2">
                                  {scan.bug_count > 0 ? (
                                    <span className="rounded-md border border-coral/40 bg-coral/10 px-2 py-0.5 text-[11px] font-semibold text-coral">
                                      {scan.bug_count} {scan.bug_count === 1 ? "bug" : "bugs"}
                                    </span>
                                  ) : (
                                    <span className="rounded-md border border-mint/40 bg-mint/10 px-2 py-0.5 text-[11px] font-semibold text-mint">
                                      0 bugs (Clean)
                                    </span>
                                  )}
                                  {scan.needs_review_count > 0 && (
                                    <span className="rounded-md border border-amber/40 bg-amber/10 px-2 py-0.5 text-[11px] font-semibold text-amber">
                                      {scan.needs_review_count} review
                                    </span>
                                  )}
                                  <span className="text-[11px] text-muted-foreground">
                                    {scan.passed_count} passed
                                  </span>
                                </div>
                              ) : scan.status === "failed" ? (
                                <span className="text-xs text-coral font-medium">Failed</span>
                              ) : (
                                <span className="text-xs text-blue-400 font-medium animate-pulse">
                                  {scan.progress || 10}%
                                </span>
                              )}

                              <Link
                                to="/report/$scanId"
                                params={{ scanId: scan.id }}
                                className="rounded-lg border border-border/80 bg-background/80 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-muted"
                              >
                                View Report →
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Verification Drawer Accordion */}
                  {isOpen && (
                    <div className="mt-5 space-y-4 rounded-2xl border border-border/60 bg-background/60 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
                        <div>
                          <h4 className="font-display text-sm font-bold">Domain Ownership Proof</h4>
                          <p className="text-xs text-muted-foreground">
                            Prove you control this domain. Only 1 verification method is required.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(["meta", "dns", "file"] as const)
                            .filter((option) => !(option === "dns" && app.managed_host))
                            .map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setMethod(option)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                  method === option
                                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {option === "meta"
                                  ? "Meta Tag (Fastest)"
                                  : option === "dns"
                                    ? "DNS Record"
                                    : "File Upload"}
                              </button>
                            ))}
                        </div>
                      </div>

                      {method === "meta" && (
                        <div className="space-y-3">
                          <CopyField
                            label="Add this meta tag inside <head> of your index.html / layout"
                            value={`<meta name="prelaunchqa-verify" content="${token}">`}
                          />
                          <p className="text-xs text-muted-foreground">
                            💡 In Lovable, Bolt, or Cursor: paste this into your root index.html or app layout file, then click "Verify Now" below.
                          </p>
                        </div>
                      )}

                      {method === "dns" && (
                        <div className="space-y-3">
                          <CopyField label="DNS Record Host" value={`_prelaunchqa.${app.host}`} />
                          <CopyField label="Record Type" value="TXT" />
                          <CopyField label="Record Value" value={`prelaunchqa-verify=${token}`} />
                          <p className="text-xs text-muted-foreground">
                            Add this TXT record at your DNS provider (Cloudflare, GoDaddy, Namecheap). May take 1-3 minutes to propagate.
                          </p>
                        </div>
                      )}

                      {method === "file" && (
                        <div className="space-y-3">
                          <CopyField
                            label="Target File Location"
                            value={`${app.origin}/.well-known/prelaunchqa.txt`}
                          />
                          <CopyField label="File Content" value={token} />
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => onVerify(app)}
                            disabled={verifying}
                            className="rounded-xl bg-primary px-5 py-2 font-display text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:brightness-110 disabled:opacity-60 active:scale-95"
                          >
                            {verifying ? "Checking DNS & DOM…" : "Verify Now"}
                          </button>
                          {verifyMessage && verifyMessage.appId === app.id && (
                            <span className={`text-xs font-semibold ${verifyMessage.ok ? "text-mint" : "text-coral"}`}>
                              {verifyMessage.text}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Are you sure you want to remove ${app.host}?`)) {
                              await removeApp({ data: { appId: app.id } });
                              await queryClient.invalidateQueries({ queryKey: ["apps"] });
                            }
                          }}
                          className="text-xs text-muted-foreground hover:text-coral transition underline"
                        >
                          Remove App
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>

        {/* Billing & Upgrade Modal */}
        {showBilling && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
            <div className="relative w-full max-w-2xl rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold">Upgrade & Check Credits</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Get deep multi-page audits, interactive flow testing, and deploy diff comparisons.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBilling(false)}
                  className="rounded-xl border border-border p-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              {checkoutError && (
                <div className="mt-4 rounded-xl border border-coral/40 bg-coral/10 p-3 text-xs text-coral">
                  {checkoutError}
                </div>
              )}

              {/* Payment Gateway Selector */}
              <div className="mt-5 rounded-2xl border border-border/80 bg-background/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select Payment Method
                </p>
                <div className="mt-2.5 grid grid-cols-3 gap-2.5">
                  {[
                    { id: "stripe", label: "Credit Card", icon: "💳", sub: "Global Cards" },
                    { id: "paypal", label: "PayPal", icon: "🅿️", sub: "International" },
                    { id: "razorpay", label: "Razorpay", icon: "⚡", sub: "UPI / Netbanking" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaymentProvider(p.id as any)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition ${
                        paymentProvider === p.id
                          ? "border-primary bg-primary/10 shadow-sm shadow-primary/20 text-foreground"
                          : "border-border/80 bg-card/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-base">{p.icon}</span>
                      <span className="mt-1 font-display text-xs font-bold">{p.label}</span>
                      <span className="text-[10px] text-muted-foreground">{p.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {/* Launch Check Pack */}
                <div className="flex flex-col justify-between rounded-2xl border border-border bg-background/80 p-6 shadow-md transition-all hover:border-primary/40">
                  <div>
                    <span className="inline-block rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      Most Popular
                    </span>
                    <h3 className="mt-2 font-display text-xl font-bold">{BILLING_PLANS.launch.name}</h3>
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
                    className="mt-6 w-full rounded-xl bg-primary px-4 py-2.5 font-display text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:brightness-110 disabled:opacity-60 active:scale-95"
                  >
                    {checkingOut === "launch" ? "Preparing checkout..." : "Buy 5 Checks ($49)"}
                  </button>
                </div>

                {/* Monthly Re-test Plan */}
                <div className="flex flex-col justify-between rounded-2xl border border-primary/50 bg-primary/5 p-6 shadow-lg shadow-primary/5 transition-all hover:border-primary">
                  <div>
                    <span className="inline-block rounded-full bg-mint/20 px-2.5 py-0.5 text-xs font-semibold text-mint">
                      Continuous QA
                    </span>
                    <h3 className="mt-2 font-display text-xl font-bold">{BILLING_PLANS.retest.name}</h3>
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
                    className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-600 to-primary px-4 py-2.5 font-display text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:opacity-60 active:scale-95"
                  >
                    {checkingOut === "retest" ? "Preparing checkout..." : "Subscribe ($99/mo)"}
                  </button>
                </div>
              </div>

              <div className="mt-6 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
                <p>
                  🔒 Secure checkout powered by Stripe. 100% money-back guarantee if checks fail to run.
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
