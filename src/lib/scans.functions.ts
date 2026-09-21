import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ScanStatus =
  | "queued"
  | "claimed"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type ScanRow = {
  id: string;
  app_id: string;
  target_url: string;
  status: ScanStatus;
  progress: number;
  progress_message: string | null;
  error: string | null;
  bug_count: number;
  needs_review_count: number;
  passed_count: number;
  created_at: string;
  finished_at: string | null;
};

const SCAN_COLUMNS =
  "id, app_id, target_url, status, progress, progress_message, error, bug_count, needs_review_count, passed_count, created_at, finished_at";

export const listScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ScanRow[]> => {
    const { data, error } = await context.supabase
      .from("scans")
      .select(SCAN_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as ScanRow[];
  });

export type RequestScanResult = { ok: true; scan: ScanRow } | { ok: false; error: string };

export const requestScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ appId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<RequestScanResult> => {
    const { data: app, error: appError } = await context.supabase
      .from("apps")
      .select("id, origin, verification_status")
      .eq("id", data.appId)
      .maybeSingle();
    if (appError) throw new Error(appError.message);
    if (!app) return { ok: false, error: "App not found." };
    if (app.verification_status !== "verified") {
      return { ok: false, error: "Verify that you own this app before running a check." };
    }

    const { data: row, error } = await context.supabase
      .from("scans")
      .insert({
        app_id: app.id,
        user_id: context.userId,
        target_url: `${app.origin}/`,
        status: "queued",
        progress_message: "Waiting for a worker",
      })
      .select(SCAN_COLUMNS)
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "A check for this app is already waiting or running." };
      }
      console.error("requestScan failed", error);
      return { ok: false, error: "We could not queue that check. Please try again." };
    }
    return { ok: true, scan: row as ScanRow };
  });

export const cancelScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ scanId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("scans")
      .update({ status: "cancelled" })
      .eq("id", data.scanId)
      .eq("status", "queued");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export type FindingRow = {
  id: string;
  rule_id: string;
  severity: "bug" | "needs_review" | "passed";
  title: string;
  detail: string | null;
  page_url: string | null;
  /** Raw evidence from the worker, already formatted as readable JSON. */
  evidence: string;
  created_at: string;
};

export const getScan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ scanId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ScanRow | null> => {
    const { data: row, error } = await context.supabase
      .from("scans")
      .select(SCAN_COLUMNS)
      .eq("id", data.scanId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as ScanRow) ?? null;
  });

export type ComparisonItem = {
  key: string;
  rule_id: string;
  severity: FindingRow["severity"];
  previousSeverity: FindingRow["severity"] | null;
  title: string;
  page_url: string | null;
};

export type ScanComparison =
  | { available: false; reason: string }
  | {
      available: true;
      previousScanId: string;
      previousFinishedAt: string | null;
      previousCounts: { bug: number; needs_review: number; passed: number };
      currentCounts: { bug: number; needs_review: number; passed: number };
      fixed: ComparisonItem[];
      newIssues: ComparisonItem[];
      changed: ComparisonItem[];
      unchanged: number;
    };

type CompareRow = {
  rule_id: string;
  severity: FindingRow["severity"];
  title: string;
  page_url: string | null;
};

const findingKey = (row: CompareRow) => `${row.rule_id}|${row.page_url ?? ""}`;

function countBySeverity(rows: CompareRow[]) {
  return {
    bug: rows.filter((r) => r.severity === "bug").length,
    needs_review: rows.filter((r) => r.severity === "needs_review").length,
    passed: rows.filter((r) => r.severity === "passed").length,
  };
}

/** Compares a finished check against the previous finished check for the same app. */
export const compareScan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ scanId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ScanComparison> => {
    const { data: scan, error: scanError } = await context.supabase
      .from("scans")
      .select("id, app_id, status, created_at")
      .eq("id", data.scanId)
      .maybeSingle();
    if (scanError) throw new Error(scanError.message);
    if (!scan) return { available: false, reason: "That check does not exist." };
    if (scan.status !== "completed") {
      return { available: false, reason: "Comparison appears once this check has finished." };
    }

    const { data: previous, error: prevError } = await context.supabase
      .from("scans")
      .select("id, finished_at, created_at")
      .eq("app_id", scan.app_id)
      .eq("status", "completed")
      .lt("created_at", scan.created_at)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prevError) throw new Error(prevError.message);
    if (!previous) {
      return {
        available: false,
        reason: "This is the first finished check for this app, so there is nothing to compare yet.",
      };
    }

    const columns = "rule_id, severity, title, page_url";
    const [{ data: currentRows, error: curErr }, { data: prevRows, error: prevRowsErr }] =
      await Promise.all([
        context.supabase.from("findings").select(columns).eq("scan_id", scan.id),
        context.supabase.from("findings").select(columns).eq("scan_id", previous.id),
      ]);
    if (curErr) throw new Error(curErr.message);
    if (prevRowsErr) throw new Error(prevRowsErr.message);

    const current = (currentRows ?? []) as CompareRow[];
    const before = (prevRows ?? []) as CompareRow[];

    const beforeMap = new Map(before.map((row) => [findingKey(row), row]));
    const currentMap = new Map(current.map((row) => [findingKey(row), row]));

    const newIssues: ComparisonItem[] = [];
    const changed: ComparisonItem[] = [];
    let unchanged = 0;

    for (const row of current) {
      const key = findingKey(row);
      const old = beforeMap.get(key);
      const item: ComparisonItem = {
        key,
        rule_id: row.rule_id,
        severity: row.severity,
        previousSeverity: old?.severity ?? null,
        title: row.title,
        page_url: row.page_url,
      };
      if (!old) {
        if (row.severity !== "passed") newIssues.push(item);
        else unchanged += 1;
      } else if (old.severity !== row.severity) {
        changed.push(item);
      } else {
        unchanged += 1;
      }
    }

    const fixed: ComparisonItem[] = [];
    for (const row of before) {
      const key = findingKey(row);
      if (row.severity === "passed") continue;
      if (!currentMap.has(key)) {
        fixed.push({
          key,
          rule_id: row.rule_id,
          severity: row.severity,
          previousSeverity: row.severity,
          title: row.title,
          page_url: row.page_url,
        });
      }
    }

    return {
      available: true,
      previousScanId: previous.id,
      previousFinishedAt: previous.finished_at ?? previous.created_at,
      previousCounts: countBySeverity(before),
      currentCounts: countBySeverity(current),
      fixed,
      newIssues,
      changed,
      unchanged,
    };
  });

export const listFindings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ scanId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<FindingRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("findings")
      .select("id, rule_id, severity, title, detail, page_url, evidence, created_at")
      .eq("scan_id", data.scanId)
      .order("severity", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => ({
      id: row.id,
      rule_id: row.rule_id,
      severity: row.severity as FindingRow["severity"],
      title: row.title,
      detail: row.detail,
      page_url: row.page_url,
      evidence: JSON.stringify(row.evidence ?? {}, null, 2),
      created_at: row.created_at,
    }));
  });
