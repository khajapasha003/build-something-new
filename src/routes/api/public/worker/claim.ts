import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/worker/claim")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyWorkerRequest, json } = await import("@/lib/worker-auth.server");
        const verified = await verifyWorkerRequest(request);
        if (!verified.ok) return json({ error: verified.error }, verified.status);

        const parsed = z.object({ worker_id: z.string().min(1).max(100) }).safeParse(verified.body);
        if (!parsed.success) return json({ error: "worker_id is required" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Requeue jobs whose worker went away (claimed/running with no update for 15 min).
        const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        await supabaseAdmin
          .from("scans")
          .update({
            status: "failed",
            error: "Worker stopped responding",
            finished_at: new Date().toISOString(),
          })
          .in("status", ["claimed", "running"])
          .lt("updated_at", staleBefore);

        const { data: candidates, error } = await supabaseAdmin
          .from("scans")
          .select("id, app_id, user_id, target_url")
          .eq("status", "queued")
          .order("created_at", { ascending: true })
          .limit(5);
        if (error) {
          console.error("claim: queue read failed", error);
          return json({ error: "Queue unavailable" }, 500);
        }

        for (const candidate of candidates ?? []) {
          const claimToken = crypto.randomUUID();
          const { data: claimed, error: claimError } = await supabaseAdmin
            .from("scans")
            .update({
              status: "claimed",
              claim_token: claimToken,
              worker_id: parsed.data.worker_id,
              claimed_at: new Date().toISOString(),
              progress: 1,
              progress_message: "Claimed by worker",
            })
            .eq("id", candidate.id)
            .eq("status", "queued")
            .select("id, target_url, app_id")
            .maybeSingle();

          if (claimError) {
            console.error("claim: update failed", claimError);
            continue;
          }
          if (!claimed) continue; // another worker won the race

          const { data: app } = await supabaseAdmin
            .from("apps")
            .select("origin, built_with, verification_status")
            .eq("id", claimed.app_id)
            .maybeSingle();

          // Defence in depth: never hand a worker an unverified target.
          if (!app || app.verification_status !== "verified") {
            await supabaseAdmin
              .from("scans")
              .update({
                status: "failed",
                error: "App ownership is no longer verified",
                finished_at: new Date().toISOString(),
              })
              .eq("id", claimed.id);
            continue;
          }

          await supabaseAdmin.from("scan_events").insert({
            scan_id: candidate.id,
            user_id: candidate.user_id,
            progress: 1,
            message: `Claimed by worker ${parsed.data.worker_id}`,
          });

          return json({
            job: {
              scan_id: claimed.id,
              claim_token: claimToken,
              target_url: claimed.target_url,
              origin: app.origin,
              built_with: app.built_with,
            },
          });
        }

        return json({ job: null });
      },
    },
  },
});
