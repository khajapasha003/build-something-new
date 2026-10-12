import { createFileRoute } from "@tanstack/react-router";

/**
 * Constant-time comparison between two hex strings to prevent timing attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifies Stripe webhook signature against the raw request body.
 * Complies with Stripe's signature verification specification:
 * Header: stripe-signature: t=<timestamp>,v1=<signature>[,v1=...]
 */
export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<{ ok: true; timestamp: number } | { ok: false; error: string }> {
  if (!signatureHeader) {
    return { ok: false, error: "Missing stripe-signature header" };
  }

  if (!secret) {
    return { ok: false, error: "Webhook secret not configured" };
  }

  const parts = signatureHeader.split(",").map((p) => p.trim());
  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (!key || !value) continue;
    if (key === "t") {
      timestamp = parseInt(value, 10);
    } else if (key === "v1") {
      signatures.push(value);
    }
  }

  if (!timestamp || isNaN(timestamp)) {
    return { ok: false, error: "Missing or invalid timestamp in signature header" };
  }

  if (signatures.length === 0) {
    return { ok: false, error: "No v1 signature found in header" };
  }

  // Prevent replay attacks (5 minute default window)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTimestamp - timestamp) > toleranceSeconds) {
    return { ok: false, error: "Signature timestamp outside tolerance window" };
  }

  const payload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const matches = signatures.some((sig) => constantTimeCompare(sig, expectedSignature));
  if (!matches) {
    return { ok: false, error: "Signature verification failed" };
  }

  return { ok: true, timestamp };
}

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
