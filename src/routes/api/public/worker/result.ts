import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const findingSchema = z.object({
  rule_id: z.string().min(1).max(100),
  severity: z.enum(["bug", "needs_review", "passed"]),
  title: z.string().min(1).max(200),
  detail: z.string().max(4000).optional(),
  page_url: z.string().url().max(2048).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
});

export const Route = createFileRoute("/api/public/worker/result")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyWorkerRequest, json } = await import("@/lib/worker-auth.server");
        const verified = await verifyWorkerRequest(request);
        if (!verified.ok) return json({ error: verified.error }, verified.status);

        const parsed = z
          .object({
            scan_id: z.string().uuid(),
            claim_token: z.string().uuid(),
            status: z.enum(["completed", "failed"]),
            error: z.string().max(1000).optional(),
            findings: z.array(findingSchema).max(500).default([]),
          })
          .safeParse(verified.body);
        if (!parsed.success) return json({ error: "Invalid result payload" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: scan } = await supabaseAdmin
          .from("scans")
          .select("id, user_id, app_id, status, claim_token")
          .eq("id", parsed.data.scan_id)
          .maybeSingle();

        if (!scan || scan.claim_token !== parsed.data.claim_token) {
          return json({ error: "Unknown job" }, 404);
        }
        if (!["claimed", "running"].includes(scan.status)) {
          return json({ error: `Job is ${scan.status}` }, 409);
        }

        // Truth rule: a finding with no evidence is dropped, never displayed.
        const findings =
          parsed.data.status === "completed"
            ? parsed.data.findings.filter((f) => f.evidence && Object.keys(f.evidence).length > 0)
            : [];

        if (findings.length > 0) {
          const { error: insertError } = await supabaseAdmin.from("findings").insert(
            findings.map((f) => ({
              scan_id: scan.id,
              app_id: scan.app_id,
              user_id: scan.user_id,
              rule_id: f.rule_id,
              severity: f.severity,
              title: f.title,
              detail: f.detail ?? null,
              page_url: f.page_url ?? null,
              evidence: (f.evidence ?? {}) as Record<string, never>,
            })),
          );
          if (insertError) {
            console.error("result: findings insert failed", insertError);
            return json({ error: "Could not store findings" }, 500);
          }
        }

        const count = (severity: string) => findings.filter((f) => f.severity === severity).length;

        await supabaseAdmin
          .from("scans")
          .update({
            status: parsed.data.status,
            progress: 100,
            progress_message:
              parsed.data.status === "completed" ? "Check finished" : "Check failed",
            error: parsed.data.error ?? null,
            bug_count: count("bug"),
            needs_review_count: count("needs_review"),
            passed_count: count("passed"),
            finished_at: new Date().toISOString(),
            claim_token: null,
          })
          .eq("id", scan.id);

        await supabaseAdmin.from("scan_events").insert({
          scan_id: scan.id,
          user_id: scan.user_id,
          progress: 100,
          message:
            parsed.data.status === "completed"
              ? `Finished with ${count("bug")} bug(s), ${count("needs_review")} needing review`
              : `Failed: ${parsed.data.error ?? "no reason given"}`,
        });

        return json({
          ok: true,
          stored_findings: findings.length,
          dropped_without_evidence: parsed.data.findings.length - findings.length,
        });
      },
    },
  },
});
