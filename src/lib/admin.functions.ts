import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminScanRow = {
  id: string;
  target_url: string;
  status: string;
  error: string | null;
  bug_count: number;
  needs_review_count: number;
  passed_count: number;
  created_at: string;
  finished_at: string | null;
  user_id: string;
  app_id: string;
};

export type AdminFindingRow = {
  id: string;
  scan_id: string;
  rule_id: string;
  severity: "bug" | "needs_review" | "passed";
  title: string;
  detail: string | null;
  page_url: string | null;
  evidence: string;
  review_status: "unreviewed" | "approved" | "flagged";
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

/** True only when the signed-in user holds the admin role. */
export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    return data === true;
  });

export const adminListScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ status: z.string().optional() })
      .default({})
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<AdminScanRow[]> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Forbidden");

    let query = context.supabase
      .from("scans")
      .select(
        "id, target_url, status, error, bug_count, needs_review_count, passed_count, created_at, finished_at, user_id, app_id",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status && data.status !== "all") query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as AdminScanRow[];
  });

export const adminListFindings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ scanId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<AdminFindingRow[]> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Forbidden");

    const { data: rows, error } = await context.supabase
      .from("findings")
      .select(
        "id, scan_id, rule_id, severity, title, detail, page_url, evidence, review_status, review_note, reviewed_at, created_at",
      )
      .eq("scan_id", data.scanId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return (rows ?? []).map((row) => ({
      id: row.id,
      scan_id: row.scan_id,
      rule_id: row.rule_id,
      severity: row.severity as AdminFindingRow["severity"],
      title: row.title,
      detail: row.detail,
      page_url: row.page_url,
      evidence: JSON.stringify(row.evidence ?? {}, null, 2),
      review_status: (row.review_status ?? "unreviewed") as AdminFindingRow["review_status"],
      review_note: row.review_note,
      reviewed_at: row.reviewed_at,
      created_at: row.created_at,
    }));
  });

export const adminReviewFinding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        findingId: z.string().uuid(),
        reviewStatus: z.enum(["unreviewed", "approved", "flagged"]),
        note: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Forbidden");

    const { error } = await context.supabase
      .from("findings")
      .update({
        review_status: data.reviewStatus,
        review_note: data.note?.trim() ? data.note.trim() : null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.findingId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
