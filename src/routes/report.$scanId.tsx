import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteChrome";
import { supabase } from "@/integrations/supabase/client";
import { getPublicScanSummary } from "@/lib/scans.functions";

export const Route = createFileRoute("/report/$scanId")({
  component: PublicReportPage,
  head: () => ({
    meta: [
      { title: "Verification Report — PreLaunchQA" },
      {
        name: "description",
        content:
          "Public browser verification report. Real Chromium browser checks for console errors, network failures, and broken links.",
      },
      { property: "og:title", content: "Verification Report — PreLaunchQA" },
      {
        property: "og:description",
        content: "Browser verification report backed by raw evidence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const SEVERITY: Record<
  "bug" | "needs_review" | "passed",
  { label: string; dot: string; cardClass: string; badgeClass: string; order: number }
> = {
  bug: {
    label: "Runtime Bug",
    dot: "bg-coral shadow-sm shadow-coral/50",
    cardClass: "border-coral/40 bg-coral/5",
    badgeClass: "border-coral/40 bg-coral/10 text-coral",
    order: 0,
  },
  needs_review: {
    label: "Needs Review",
    dot: "bg-amber shadow-sm shadow-amber/50",
    cardClass: "border-amber/40 bg-amber/5",
    badgeClass: "border-amber/40 bg-amber/10 text-amber",
    order: 1,
  },
  passed: {
    label: "Verified Passed",
    dot: "bg-mint shadow-sm shadow-mint/50",
    cardClass: "border-mint/30 bg-mint/5",
    badgeClass: "border-mint/40 bg-mint/10 text-mint",
    order: 2,
  },
};

function BadgeEmbedCard({ scanId }: { scanId: string }) {
  const [copiedType, setCopiedType] = useState<"md" | "html" | null>(null);

  const markdownSnippet = `[![PreLaunchQA Verified](https://prelaunchqa.com/api/public/badge?scanId=${scanId})](https://prelaunchqa.com/report/${scanId})`;
  const htmlSnippet = `<a href="https://prelaunchqa.com/report/${scanId}" target="_blank" rel="noopener"><img src="https://prelaunchqa.com/api/public/badge?scanId=${scanId}" alt="PreLaunchQA Verified" /></a>`;

  const copy = (type: "md" | "html", text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <section className="mt-8 rounded-3xl border border-border/80 bg-card/60 p-6 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold">Shareable Verification Badge</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Embed this official badge on your website footer, GitHub README, or product launch page.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/80 p-2 shadow-sm">
          <img
            src={`/api/public/badge?scanId=${scanId}`}
            alt="PreLaunchQA Verified Badge"
            className="h-6 w-auto"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Markdown (GitHub & Docs)</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={markdownSnippet}
              className="min-w-0 flex-1 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 font-mono text-xs text-foreground/90 select-all"
            />
            <button
              type="button"
              onClick={() => copy("md", markdownSnippet)}
              className={`shrink-0 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                copiedType === "md"
                  ? "border-mint/50 bg-mint/15 text-mint"
                  : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {copiedType === "md" ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">HTML (Website Footer)</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={htmlSnippet}
              className="min-w-0 flex-1 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 font-mono text-xs text-foreground/90 select-all"
            />
            <button
              type="button"
              onClick={() => copy("html", htmlSnippet)}
              className={`shrink-0 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                copiedType === "html"
                  ? "border-mint/50 bg-mint/15 text-mint"
                  : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {copiedType === "html" ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PublicReportPage() {
  const { scanId } = Route.useParams();
  const fetchReport = useServerFn(getPublicScanSummary);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session?.user));
    });
  }, []);

  const reportQuery = useQuery({
    queryKey: ["public-report", scanId],
    queryFn: () => fetchReport({ data: { scanId } }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ["queued", "claimed", "running"].includes(status) ? 3000 : false;
    },
  });

  const report = reportQuery.data;

  if (reportQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border/60 bg-background/80 px-6 py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <Link to="/">
              <BrandLogo />
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-24 text-center">
          <span className="inline-block animate-spin text-2xl mb-3">⟳</span>
          <p className="text-sm text-muted-foreground">Loading verification report…</p>
        </main>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border/60 bg-background/80 px-6 py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <Link to="/">
              <BrandLogo />
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Report Not Found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This verification report does not exist or has not completed yet.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-display text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
          >
            Go to PreLaunchQA Home
          </Link>
        </main>
      </div>
    );
  }

  const findings = [...report.findings].sort(
    (a, b) => SEVERITY[a.severity].order - SEVERITY[b.severity].order,
  );

  const totalChecks = report.bug_count + report.needs_review_count + report.passed_count;
  const passRate = totalChecks > 0 ? Math.round((report.passed_count / totalChecks) * 100) : 100;
  const isClean = report.bug_count === 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-center">
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-4">
            {hasSession ? (
              <Link
                to="/app"
                className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              >
                ← Back to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-primary px-4 py-2 font-display text-xs font-semibold text-white shadow-md shadow-primary/20 transition hover:brightness-110 active:scale-95"
                >
                  Audit your app free →
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
        {/* Verification Status Header Pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/40 bg-mint/10 px-3 py-1 text-xs font-semibold text-mint">
            <span className="size-1.5 rounded-full bg-mint" />
            Verified Chromium Browser Audit
          </span>
          <span className="text-xs text-muted-foreground">· Session ID: {report.id.slice(0, 8)}</span>
        </div>

        {/* Big Report Scorecard Hero */}
        <section className="mt-4 overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-6 sm:p-8 backdrop-blur shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold break-all">
                {report.target_url}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Audited in a headless Chromium sandbox on{" "}
                {new Date(report.finished_at || report.created_at).toLocaleDateString()} at{" "}
                {new Date(report.finished_at || report.created_at).toLocaleTimeString()}
              </p>

              {/* Status Indicator Bar */}
              <div className="mt-4 flex flex-wrap gap-2.5 pt-2">
                <span className="inline-flex items-center gap-2 rounded-xl border border-coral/40 bg-coral/10 px-3 py-1.5 text-xs font-bold text-coral">
                  <span className="size-2 rounded-full bg-coral" />
                  {report.bug_count} {report.bug_count === 1 ? "Critical Bug" : "Critical Bugs"}
                </span>

                <span className="inline-flex items-center gap-2 rounded-xl border border-amber/40 bg-amber/10 px-3 py-1.5 text-xs font-bold text-amber">
                  <span className="size-2 rounded-full bg-amber" />
                  {report.needs_review_count} To Review
                </span>

                <span className="inline-flex items-center gap-2 rounded-xl border border-mint/40 bg-mint/10 px-3 py-1.5 text-xs font-bold text-mint">
                  <span className="size-2 rounded-full bg-mint" />
                  {report.passed_count} Passed
                </span>
              </div>
            </div>

            {/* Circular Pass Gauge Badge */}
            <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-border/80 bg-background/80 p-5 shadow-inner">
              <div className="text-center">
                <div className={`font-display text-4xl font-extrabold ${isClean ? "text-mint" : "text-amber"}`}>
                  {passRate}%
                </div>
                <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {isClean ? "Ready to Launch" : "Needs Review"}
                </div>
              </div>
              <div className="h-10 w-px bg-border/60" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <div>{totalChecks} checkpoints evaluated</div>
                <div className="font-semibold text-foreground">
                  {isClean ? "✓ Zero runtime crashes" : "⚠️ Review flagged items"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Shareable Verification Badge Card */}
        <BadgeEmbedCard scanId={report.id} />

        {/* Findings List Section */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">
              Audit Findings & Evidence ({findings.length})
            </h2>
            <span className="text-xs text-muted-foreground">Backed by raw browser logs</span>
          </div>

          {findings.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-mint/40 bg-mint/5 p-8 text-center backdrop-blur">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-mint/20 text-mint">
                ✓
              </div>
              <p className="mt-3 font-display text-lg font-bold text-mint">
                100% Clean Audit — All Automated Checks Passed!
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                No runtime console exceptions, unhandled network failures, or critical accessibility gaps were detected in this browser session.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3.5">
              {findings.map((f) => {
                const meta = SEVERITY[f.severity] || SEVERITY.needs_review;
                return (
                  <li
                    key={f.id}
                    className={`rounded-3xl border p-5 backdrop-blur transition-all ${meta.cardClass}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${meta.dot}`} />
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {f.rule_id}
                        </span>
                      </div>
                      {f.page_url && (
                        <span className="truncate font-mono text-[11px] text-muted-foreground/80 max-w-xs">
                          {f.page_url}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2.5 font-display text-base font-semibold text-foreground">
                      {f.title}
                    </h3>
                    {f.detail && (
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {f.detail}
                      </p>
                    )}

                    {f.evidence && (
                      <details className="mt-3.5">
                        <summary className="cursor-pointer font-mono text-xs font-semibold text-primary transition hover:underline">
                          Inspect Raw Browser Evidence ↓
                        </summary>
                        <pre className="mt-2.5 max-h-64 overflow-auto rounded-2xl border border-border/80 bg-background/90 p-3.5 font-mono text-[11px] text-emerald-400">
                          {f.evidence}
                        </pre>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Viral Conversion Box */}
        <section className="mt-14 overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card/80 to-background p-8 text-center sm:p-12 shadow-2xl">
          <span className="inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary mb-4">
            Automated Quality Assurance
          </span>
          <h2 className="font-display text-2xl font-bold sm:text-4xl">
            Want your AI web app verified like this?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
            PreLaunchQA loads your web application in a real Chromium browser before you share it with users or investors. Catch unhandled errors, dead links, and broken forms with raw proof.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <Link
              to="/auth"
              className="rounded-2xl bg-gradient-to-r from-violet-600 via-primary to-indigo-600 px-6 py-3.5 font-display text-xs font-bold text-white shadow-xl shadow-primary/25 transition hover:brightness-110 active:scale-95"
            >
              Start Free Sample Audit →
            </Link>
            <Link
              to="/preorder"
              className="rounded-2xl border border-border/80 bg-card/80 px-6 py-3.5 font-display text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              View Launch Plans
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
