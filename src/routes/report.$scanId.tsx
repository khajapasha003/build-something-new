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

const SEVERITY: Record<"bug" | "needs_review" | "passed", { label: string; dot: string; order: number }> = {
  bug: { label: "Bug", dot: "bg-coral", order: 0 },
  needs_review: { label: "Needs review", dot: "bg-amber", order: 1 },
  passed: { label: "Passed", dot: "bg-mint", order: 2 },
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
    <section className="mt-8 rounded-3xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Shareable verification badge</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Embed this badge on your website footer, README, or ProductHunt post to prove your app was checked in a real browser.
          </p>
        </div>
        <img
          src={`/api/public/badge?scanId=${scanId}`}
          alt="PreLaunchQA Verified Badge"
          className="h-6 w-auto"
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Markdown (GitHub & Docs)</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={markdownSnippet}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => copy("md", markdownSnippet)}
              className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
            >
              {copiedType === "md" ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">HTML (Website Footer)</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={htmlSnippet}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => copy("html", htmlSnippet)}
              className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
            >
              {copiedType === "html" ? "Copied!" : "Copy"}
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
      return status && ["queued", "claimed", "running"].includes(status) ? 4000 : false;
    },
  });

  const report = reportQuery.data;

  if (reportQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border/60 bg-background/80 px-6 py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <Link to="/">
              <BrandLogo className="h-8 w-auto" />
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-16 text-center text-sm text-muted-foreground">
          Loading verification report…
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
              <BrandLogo className="h-8 w-auto" />
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h1 className="text-xl font-semibold">Report Not Found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This verification report does not exist or has not completed yet.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center">
            <BrandLogo className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            {hasSession ? (
              <Link
                to="/app"
                className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                ← Back to your dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-xs text-muted-foreground transition hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  Audit your app free →
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint/10 px-3 py-1 text-xs font-medium text-mint">
          <span className="size-2 rounded-full bg-mint" />
          PreLaunchQA Verified Report
        </div>

        <header className="mt-4 rounded-3xl border border-border bg-card p-6">
          <h1 className="font-display text-2xl sm:text-3xl">{report.target_url}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Audit completed on {new Date(report.finished_at || report.created_at).toLocaleDateString()} at{" "}
            {new Date(report.finished_at || report.created_at).toLocaleTimeString()}
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1">
              <span className="size-2 rounded-full bg-coral" />
              {report.bug_count} {report.bug_count === 1 ? "bug" : "bugs"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1">
              <span className="size-2 rounded-full bg-amber" />
              {report.needs_review_count} to review
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1">
              <span className="size-2 rounded-full bg-mint" />
              {report.passed_count} passed
            </span>
          </div>
        </header>

        {/* Badge Embed Card */}
        <BadgeEmbedCard scanId={report.id} />

        {/* Findings List */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Audit Findings ({findings.length})</h2>
          {findings.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm font-medium text-mint">All automated checks passed!</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No console errors, broken links, or critical accessibility gaps were detected on this page.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {findings.map((f) => (
                <li key={f.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`size-2 rounded-full ${SEVERITY[f.severity].dot}`} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {SEVERITY[f.severity].label}
                    </span>
                    <span className="text-xs text-muted-foreground">· {f.rule_id}</span>
                  </div>
                  <h3 className="mt-2 text-base font-medium">{f.title}</h3>
                  {f.detail && <p className="mt-1 text-sm text-muted-foreground">{f.detail}</p>}
                  {f.page_url && (
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground/80">{f.page_url}</p>
                  )}
                  {f.evidence && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-muted-foreground transition hover:text-foreground">
                        Raw Evidence
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-muted p-3 font-mono text-xs text-foreground">
                        {f.evidence}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Viral Conversion Box */}
        <section className="mt-14 rounded-3xl border border-primary/30 bg-primary/5 p-8 text-center sm:p-10">
          <h2 className="text-2xl font-bold sm:text-3xl">Want your web app checked like this?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            PreLaunchQA loads your web application in a real Chromium browser before you share it with users.
            Find console errors, dead links, and broken forms with raw proof.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              to="/auth"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
            >
              Start Free Sample Check →
            </Link>
            <Link
              to="/preorder"
              className="rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
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
