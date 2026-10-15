import { createFileRoute } from "@tanstack/react-router";

import { verifyStripeSignature, constantTimeCompare } from "@/lib/stripe-sig";

export { verifyStripeSignature, constantTimeCompare };

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        // If webhook secret is not set, reject to prevent unverified processing
        if (!webhookSecret) {
          console.error("STRIPE_WEBHOOK_SECRET is not configured.");
          return new Response(
            JSON.stringify({ error: "Webhook secret not configured on server" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const rawBody = await request.text();
        const verification = await verifyStripeSignature(rawBody, signature, webhookSecret);

        if (!verification.ok) {
          return new Response(
            JSON.stringify({ error: verification.error }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }

        let event: any;
        try {
          event = JSON.parse(rawBody);
        } catch {
          return new Response(
            JSON.stringify({ error: "Invalid JSON body" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data?.object;
            const userId = session?.client_reference_id || session?.metadata?.userId;
            const planId = session?.metadata?.planId || "launch";

            if (userId) {
              // Update order status
              await supabaseAdmin
                .from("orders")
                .update({
                  status: "succeeded",
                  stripe_payment_intent_id: session.payment_intent,
                  updated_at: new Date().toISOString(),
                })
                .eq("stripe_session_id", session.id);

              // Update user credits / entitlements
              if (planId === "launch") {
                const { data: current } = await supabaseAdmin
                  .from("user_credits")
                  .select("scan_credits")
                  .eq("user_id", userId)
                  .maybeSingle();

                const newCredits = (current?.scan_credits ?? 1) + 5;
                await supabaseAdmin.from("user_credits").upsert({
                  user_id: userId,
                  plan: "launch",
                  scan_credits: newCredits,
                  unlimited_scans: false,
                  updated_at: new Date().toISOString(),
                });
              } else if (planId === "retest") {
                await supabaseAdmin.from("user_credits").upsert({
                  user_id: userId,
                  plan: "retest",
                  scan_credits: 999,
                  unlimited_scans: true,
                  updated_at: new Date().toISOString(),
                });
              }
            }
            break;
          }

          case "customer.subscription.created":
          case "customer.subscription.updated": {
            const sub = event.data?.object;
            const customerId = sub?.customer;
            const subId = sub?.id;
            const status = sub?.status; // active, past_due, canceled
            const currentPeriodEnd = sub?.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null;
            const currentPeriodStart = sub?.current_period_start
              ? new Date(sub.current_period_start * 1000).toISOString()
              : null;
            const cancelAtPeriodEnd = Boolean(sub?.cancel_at_period_end);

            if (subId) {
              await supabaseAdmin.from("subscriptions").upsert({
                stripe_subscription_id: subId,
                stripe_customer_id: customerId,
                status: status === "active" ? "active" : "canceled",
                current_period_start: currentPeriodStart,
                current_period_end: currentPeriodEnd,
                cancel_at_period_end: cancelAtPeriodEnd,
                updated_at: new Date().toISOString(),
              });
            }
            break;
          }

          case "customer.subscription.deleted": {
            const sub = event.data?.object;
            if (sub?.id) {
              const { data: subRow } = await supabaseAdmin
                .from("subscriptions")
                .update({
                  status: "canceled",
                  updated_at: new Date().toISOString(),
                })
                .eq("stripe_subscription_id", sub.id)
                .select("user_id")
                .maybeSingle();

              if (subRow?.user_id) {
                // Downgrade user back to free / sample tier
                await supabaseAdmin.from("user_credits").upsert({
                  user_id: subRow.user_id,
                  plan: "sample",
                  unlimited_scans: false,
                  updated_at: new Date().toISOString(),
                });
              }
            }
            break;
          }

          default:
            // Non-critical event types acknowledged
            break;
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
