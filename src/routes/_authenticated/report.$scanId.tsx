import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  getScan,
  listFindings,
  type FindingRow,
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

const SEVERITY: Record<
  FindingRow["severity"],
  { label: string; dot: string; order: number }
> = {
  bug: { label: "Bug", dot: "bg-destructive", order: 0 },
  needs_review: { label: "Needs review", dot: "bg-warning", order: 1 },
  passed: { label: "Passed", dot: "bg-success", order: 2 },
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
        <h1 className="font-display text-2xl">{scan.target_url}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Started {new Date(scan.created_at).toLocaleString()} · {statusLine(scan)}
        </p>
        {done ? (
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <Count label="bugs" value={scan.bug_count} dot="bg-destructive" />
            <Count label="to review" value={scan.needs_review_count} dot="bg-warning" />
            <Count label="passed" value={scan.passed_count} dot="bg-success" />
          </div>
        ) : null}
      </header>

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

function Count({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1">
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {value} {label}
    </span>
  );
}
