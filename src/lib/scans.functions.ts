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
  evidence: Record<string, string>;
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
    return (rows ?? []) as FindingRow[];
  });
