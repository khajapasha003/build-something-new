import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { BrandLogo } from "@/components/BrandLogo";

import {
  compareScan,
  getScan,
  listFindings,
  type ComparisonItem,
  type FindingRow,
  type ScanComparison,
  type ScanRow,
} from "@/lib/scans.functions";

export const Route = createFileRoute("/_authenticated/report/$scanId")({
  component: ReportPage,
  head: () => ({
    meta: [
      { title: "Check report — PreLaunchQA" },
      {
        name: "description",
        content:
          "Everything PreLaunchQA found on your app in this check, with the evidence behind each result.",
      },
      { property: "og:title", content: "Check report — PreLaunchQA" },
      {
        property: "og:description",
        content: "Bugs, items to review and passed checks, each with its evidence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => (
    <Shell>
      <p className="text-sm text-destructive">We could not load this report.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">That report does not exist.</p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link to="/app" className="text-xs text-muted-foreground transition hover:text-foreground">
        ← Back to your apps
      </Link>
      <div className="mt-6">{children}</div>
    </main>
  );
}

const SEVERITY: Record<FindingRow["severity"], { label: string; dot: string; order: number }> = {
  bug: { label: "Bug", dot: "bg-coral", order: 0 },
  needs_review: { label: "Needs review", dot: "bg-amber", order: 1 },
  passed: { label: "Passed", dot: "bg-mint", order: 2 },
};

function statusLine(scan: ScanRow) {
  switch (scan.status) {
    case "completed":
      return "Finished";
    case "failed":
      return scan.error ? `Failed — ${scan.error}` : "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return `${scan.progress_message ?? "Running"} (${scan.progress}%)`;
  }
}

function ReportPage() {
  const { scanId } = Route.useParams();
  const fetchScan = useServerFn(getScan);
  const fetchFindings = useServerFn(listFindings);
  const fetchComparison = useServerFn(compareScan);

  const scanQuery = useQuery({
    queryKey: ["scan", scanId],
    queryFn: () => fetchScan({ data: { scanId } }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ["queued", "claimed", "running"].includes(status) ? 4000 : false;
    },
  });

  const scan = scanQuery.data ?? null;
  const done = scan?.status === "completed";

  const findingsQuery = useQuery({
    queryKey: ["findings", scanId],
    queryFn: () => fetchFindings({ data: { scanId } }),
    enabled: Boolean(done),
  });

  const compareQuery = useQuery({
    queryKey: ["scan-compare", scanId],
    queryFn: () => fetchComparison({ data: { scanId } }),
    enabled: Boolean(done),
  });

  if (scanQuery.isLoading) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  if (!scan) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">That report does not exist.</p>
      </Shell>
    );
  }

  const findings = [...(findingsQuery.data ?? [])].sort(
    (a, b) => SEVERITY[a.severity].order - SEVERITY[b.severity].order,
  );

  return (
    <Shell>
      <header className="rounded-3xl border border-border bg-card p-6">
        <BrandLogo className="h-8 w-auto" />
        <h1 className="font-display text-2xl">{scan.target_url}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Started {new Date(scan.created_at).toLocaleString()} · {statusLine(scan)}
        </p>
        {done ? (
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <Count label="bugs" value={scan.bug_count} dot="bg-coral" />
            <Count label="to review" value={scan.needs_review_count} dot="bg-amber" />
            <Count label="passed" value={scan.passed_count} dot="bg-mint" />
          </div>
        ) : null}
      </header>

      {done ? (
        <CompareSection comparison={compareQuery.data} loading={compareQuery.isLoading} />
      ) : null}

      {!done ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {scan.status === "failed" || scan.status === "cancelled"
            ? "No results were recorded for this check."
            : "This check is still running. Results appear here as soon as it finishes."}
        </p>
      ) : findingsQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading results…</p>
      ) : findings.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          This check recorded no results with evidence.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {findings.map((finding) => (
            <li key={finding.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${SEVERITY[finding.severity].dot}`}
                  aria-hidden
                />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {SEVERITY[finding.severity].label}
                </span>
                <span className="text-xs text-muted-foreground">· {finding.rule_id}</span>
              </div>
              <p className="mt-2 text-base">{finding.title}</p>
              {finding.detail ? (
                <p className="mt-1 text-sm text-muted-foreground">{finding.detail}</p>
              ) : null}
              {finding.page_url ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">{finding.page_url}</p>
              ) : null}
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-muted-foreground transition hover:text-foreground">
                  Evidence
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-muted p-3 text-xs">
                  {finding.evidence}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function CompareSection({
  comparison,
  loading,
}: {
  comparison: ScanComparison | undefined;
  loading: boolean;
}) {
  if (loading) {
    return <p className="mt-6 text-sm text-muted-foreground">Comparing with the previous check…</p>;
  }
  if (!comparison) return null;
  if (!comparison.available) {
    return <p className="mt-6 text-sm text-muted-foreground">{comparison.reason}</p>;
  }

  const delta = (now: number, before: number) => {
    const diff = now - before;
    if (diff === 0) return "no change";
    return diff > 0 ? `+${diff}` : `${diff}`;
  };

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-6">
      <h2 className="font-display text-lg">Since the last check</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Compared with the check finished{" "}
        {comparison.previousFinishedAt
          ? new Date(comparison.previousFinishedAt).toLocaleString()
          : "earlier"}
        .{" "}
        <Link
          to="/report/$scanId"
          params={{ scanId: comparison.previousScanId }}
          className="underline underline-offset-2 transition hover:text-foreground"
        >
          Open that report
        </Link>
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Count
          label={`bugs (${delta(comparison.currentCounts.bug, comparison.previousCounts.bug)})`}
          value={comparison.currentCounts.bug}
          dot="bg-coral"
        />
        <Count
          label={`to review (${delta(
            comparison.currentCounts.needs_review,
            comparison.previousCounts.needs_review,
          )})`}
          value={comparison.currentCounts.needs_review}
          dot="bg-amber"
        />
        <Count
          label={`passed (${delta(
            comparison.currentCounts.passed,
            comparison.previousCounts.passed,
          )})`}
          value={comparison.currentCounts.passed}
          dot="bg-mint"
        />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <CompareList title="Fixed" items={comparison.fixed} dot="bg-mint" empty="Nothing fixed." />
        <CompareList title="New" items={comparison.newIssues} dot="bg-coral" empty="Nothing new." />
        <CompareList
          title="Changed"
          items={comparison.changed}
          dot="bg-amber"
          empty="Nothing changed."
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {comparison.unchanged} result{comparison.unchanged === 1 ? "" : "s"} stayed the same.
      </p>
    </section>
  );
}

function CompareList({
  title,
  items,
  dot,
  empty,
}: {
  title: string;
  items: ComparisonItem[];
  dot: string;
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden />
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground">
          {title} ({items.length})
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.key} className="text-sm">
              <p>{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.rule_id}
                {item.previousSeverity && item.previousSeverity !== item.severity
                  ? ` · ${SEVERITY[item.previousSeverity].label} → ${SEVERITY[item.severity].label}`
                  : ""}
              </p>
              {item.page_url ? (
                <p className="truncate text-xs text-muted-foreground">{item.page_url}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Count({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1">
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {value} {label}
    </span>
  );
}
