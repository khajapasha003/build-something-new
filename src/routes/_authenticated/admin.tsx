import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import {
  adminListFindings,
  adminListScans,
  adminReviewFinding,
  amIAdmin,
  type AdminFindingRow,
  type AdminScanRow,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Review console — PreLaunchQA" },
      {
        name: "description",
        content:
          "Internal review console: inspect the raw evidence behind every check result and approve or flag it.",
      },
      { property: "og:title", content: "Review console — PreLaunchQA" },
      {
        property: "og:description",
        content: "Inspect raw evidence and approve or flag findings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => (
    <Shell>
      <p className="text-sm text-destructive">We could not load the review console.</p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-6xl px-6 py-12">{children}</main>;
}

const STATUSES = ["all", "completed", "failed", "cancelled", "queued", "claimed", "running"];

const SEVERITY: Record<AdminFindingRow["severity"], { label: string; dot: string }> = {
  bug: { label: "Bug", dot: "bg-coral" },
  needs_review: { label: "Needs review", dot: "bg-amber" },
  passed: { label: "Passed", dot: "bg-mint" },
};

const REVIEW: Record<AdminFindingRow["review_status"], { label: string; className: string }> = {
  unreviewed: { label: "Unreviewed", className: "border-border text-muted-foreground" },
  approved: { label: "Approved", className: "border-mint text-mint" },
  flagged: { label: "Flagged", className: "border-coral text-coral" },
};

function AdminPage() {
  const checkAdmin = useServerFn(amIAdmin);
  const fetchScans = useServerFn(adminListScans);
  const [status, setStatus] = useState("all");
  const [openScan, setOpenScan] = useState<string | null>(null);

  const adminQuery = useQuery({ queryKey: ["am-i-admin"], queryFn: () => checkAdmin() });

  const scansQuery = useQuery({
    queryKey: ["admin-scans", status],
    queryFn: () => fetchScans({ data: { status } }),
    enabled: adminQuery.data === true,
  });

  if (adminQuery.isLoading) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  if (adminQuery.data !== true) {
    return (
      <Shell>
        <h1 className="font-display text-2xl">Review console</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This area is for reviewers only. Your account does not have reviewer access.
        </p>
      </Shell>
    );
  }

  const scans = scansQuery.data ?? [];

  return (
    <Shell>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Review console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every check, with the raw evidence behind each result. Approving or flagging here does
            not re-run anything.
          </p>
        </div>
        <label className="text-xs text-muted-foreground">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="ml-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </header>

      {scansQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading checks…</p>
      ) : scans.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No checks match this filter.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {scans.map((scan) => (
            <ScanCard
              key={scan.id}
              scan={scan}
              open={openScan === scan.id}
              onToggle={() => setOpenScan(openScan === scan.id ? null : scan.id)}
            />
          ))}
        </ul>
      )}
    </Shell>
  );
}

function ScanCard({
  scan,
  open,
  onToggle,
}: {
  scan: AdminScanRow;
  open: boolean;
  onToggle: () => void;
}) {
  const fetchFindings = useServerFn(adminListFindings);
  const findingsQuery = useQuery({
    queryKey: ["admin-findings", scan.id],
    queryFn: () => fetchFindings({ data: { scanId: scan.id } }),
    enabled: open,
  });

  return (
    <li className="rounded-2xl border border-border bg-card p-5">
      <button type="button" onClick={onToggle} className="w-full text-left">
        <p className="font-display text-base">{scan.target_url}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {scan.status} · {new Date(scan.created_at).toLocaleString()} · {scan.bug_count} bugs,{" "}
          {scan.needs_review_count} to review, {scan.passed_count} passed
          {scan.error ? ` · ${scan.error}` : ""}
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{scan.id}</p>
      </button>

      {open ? (
        findingsQuery.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading results…</p>
        ) : (findingsQuery.data ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            This check recorded no results with evidence.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {(findingsQuery.data ?? []).map((finding) => (
              <FindingCard key={finding.id} finding={finding} scanId={scan.id} />
            ))}
          </ul>
        )
      ) : null}
    </li>
  );
}

function FindingCard({ finding, scanId }: { finding: AdminFindingRow; scanId: string }) {
  const review = useServerFn(adminReviewFinding);
  const queryClient = useQueryClient();
  const [note, setNote] = useState(finding.review_note ?? "");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = async (reviewStatus: AdminFindingRow["review_status"]) => {
    setSaving(reviewStatus);
    setError(null);
    try {
      await review({ data: { findingId: finding.id, reviewStatus, note } });
      await queryClient.invalidateQueries({ queryKey: ["admin-findings", scanId] });
    } catch {
      setError("That change did not save. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${SEVERITY[finding.severity].dot}`}
          aria-hidden
        />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {SEVERITY[finding.severity].label}
        </span>
        <span className="text-xs text-muted-foreground">· {finding.rule_id}</span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] ${REVIEW[finding.review_status].className}`}
        >
          {REVIEW[finding.review_status].label}
        </span>
      </div>

      <p className="mt-2 text-sm">{finding.title}</p>
      {finding.detail ? (
        <p className="mt-1 text-xs text-muted-foreground">{finding.detail}</p>
      ) : null}
      {finding.page_url ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">{finding.page_url}</p>
      ) : null}

      <details className="mt-3" open>
        <summary className="cursor-pointer text-xs text-muted-foreground transition hover:text-foreground">
          Raw evidence
        </summary>
        <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-muted p-3 text-[11px]">
          {finding.evidence}
        </pre>
      </details>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Reviewer note (optional)"
          maxLength={500}
          className="min-w-52 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => apply("approved")}
          disabled={saving !== null}
          className="rounded-lg border border-mint px-3 py-2 text-xs text-mint transition hover:bg-mint/10 disabled:opacity-50"
        >
          {saving === "approved" ? "Saving…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => apply("flagged")}
          disabled={saving !== null}
          className="rounded-lg border border-coral px-3 py-2 text-xs text-coral transition hover:bg-coral/10 disabled:opacity-50"
        >
          {saving === "flagged" ? "Saving…" : "Flag"}
        </button>
        {finding.review_status !== "unreviewed" ? (
          <button
            type="button"
            onClick={() => apply("unreviewed")}
            disabled={saving !== null}
            className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition hover:bg-muted disabled:opacity-50"
          >
            Clear
          </button>
        ) : null}
      </div>

      {finding.reviewed_at ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Last reviewed {new Date(finding.reviewed_at).toLocaleString()}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </li>
  );
}
