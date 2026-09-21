import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/worker/progress")({
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
            progress: z.number().int().min(0).max(99),
            message: z.string().min(1).max(300),
          })
          .safeParse(verified.body);
        if (!parsed.success) return json({ error: "Invalid progress payload" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: scan } = await supabaseAdmin
          .from("scans")
          .select("id, user_id, status, claim_token")
          .eq("id", parsed.data.scan_id)
          .maybeSingle();

        if (!scan || scan.claim_token !== parsed.data.claim_token) {
          return json({ error: "Unknown job" }, 404);
        }
        if (!["claimed", "running"].includes(scan.status)) {
          return json({ error: `Job is ${scan.status}` }, 409);
        }

        await supabaseAdmin
          .from("scans")
          .update({
            status: "running",
            progress: parsed.data.progress,
            progress_message: parsed.data.message,
            ...(scan.status === "claimed" ? { started_at: new Date().toISOString() } : {}),
          })
          .eq("id", scan.id);

        await supabaseAdmin.from("scan_events").insert({
          scan_id: scan.id,
          user_id: scan.user_id,
          progress: parsed.data.progress,
          message: parsed.data.message,
        });

        return json({ ok: true });
      },
    },
  },
});
