import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const BILLING_PLANS = {
  sample: {
    id: "sample",
    name: "Sample Scan",
    price: 0,
    priceDisplay: "Free",
    type: "free",
    scanCredits: 1,
    description: "Single-page audit with raw browser evidence.",
    features: [
      "Single-page check (homepage)",
      "Raw browser console & network logs",
      "Dead links & basic DOM hygiene",
      "Public verification badges",
    ],
  },
  launch: {
    id: "launch",
    name: "Launch Check",
    price: 4900,
    priceDisplay: "$49",
    type: "one_time",
    scanCredits: 5,
    description: "Deep pre-launch check with interactive flow tests & re-scan comparison.",
    features: [
      "Multi-page deep audit (up to 20 pages)",
      "Interactive flows (forms, auth, navigation)",
      "Full evidence bundle (screenshots & trace data)",
      "1 included re-scan comparison diff",
      "Direct email report export",
    ],
  },
  retest: {
    id: "retest",
    name: "Monthly Re-test Plan",
    price: 9900,
    priceDisplay: "$99/mo",
    type: "subscription",
    scanCredits: -1,
    description: "Continuous automated verification after every release or deploy.",
    features: [
      "Unlimited automated checks",
      "Before/after deploy comparison diffs",
      "Automatic failure alerting",
      "Dedicated priority worker queue",
      "Custom test credentials vault (24h retention)",
    ],
  },
} as const;

export type PlanKey = keyof typeof BILLING_PLANS;

export type UserBillingOverview = {
  plan: PlanKey;
  scanCredits: number;
  unlimitedScans: boolean;
  activeSubscription: {
    id: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  orders: Array<{
    id: string;
    plan: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
};

export const getBillingOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserBillingOverview> => {
    // 1. Fetch user credits
    const { data: creditsData } = await context.supabase
      .from("user_credits")
      .select("plan, scan_credits, unlimited_scans")
      .eq("user_id", context.userId)
      .maybeSingle();

    // 2. Fetch active subscription if any
    const { data: subData } = await context.supabase
      .from("subscriptions")
      .select("id, status, current_period_end, cancel_at_period_end")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .maybeSingle();

    // 3. Fetch recent orders
    const { data: ordersData } = await context.supabase
      .from("orders")
      .select("id, plan, amount, currency, status, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(10);

    const plan = (creditsData?.plan as PlanKey) ?? (subData ? "retest" : "sample");
    const scanCredits = creditsData?.scan_credits ?? 1;
    const unlimitedScans = creditsData?.unlimited_scans ?? Boolean(subData);

    return {
      plan,
      scanCredits,
      unlimitedScans,
      activeSubscription: subData
        ? {
            id: subData.id,
            status: subData.status,
            currentPeriodEnd: subData.current_period_end,
            cancelAtPeriodEnd: subData.cancel_at_period_end,
          }
        : null,
      orders: (ordersData ?? []).map((o) => ({
        id: o.id,
        plan: o.plan,
        amount: o.amount,
        currency: o.currency,
        status: o.status,
        createdAt: o.created_at,
      })),
    };
  });

const checkoutInputSchema = z.object({
  planId: z.enum(["launch", "retest"]),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
});

export type CreateCheckoutResult =
  | { ok: true; url: string; mode: "stripe" | "test" }
  | { ok: false; error: string };

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => checkoutInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<CreateCheckoutResult> => {
    const selectedPlan = BILLING_PLANS[data.planId];
    if (!selectedPlan) {
      return { ok: false, error: "Invalid plan selected." };
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const appOrigin = process.env.APP_ORIGIN || "https://prelaunchqa.com";

    const successUrl = data.successUrl || `${appOrigin}/app?checkout=success&plan=${data.planId}`;
    const cancelUrl = data.cancelUrl || `${appOrigin}/app?checkout=cancelled`;

    // 1. If live or test Stripe key is provided, create a real Stripe Checkout Session
    if (stripeKey && stripeKey.trim().length > 0) {
      try {
        const isSubscription = selectedPlan.type === "subscription";
        const bodyParams = new URLSearchParams();
        bodyParams.append("client_reference_id", context.userId);
        bodyParams.append("customer_email", context.session.user.email ?? "");
        bodyParams.append("mode", isSubscription ? "subscription" : "payment");
        bodyParams.append("success_url", successUrl);
        bodyParams.append("cancel_url", cancelUrl);
        bodyParams.append("metadata[userId]", context.userId);
        bodyParams.append("metadata[planId]", data.planId);

        bodyParams.append("line_items[0][price_data][currency]", "usd");
        bodyParams.append(
          "line_items[0][price_data][product_data][name]",
          `PreLaunchQA - ${selectedPlan.name}`,
        );
        bodyParams.append(
          "line_items[0][price_data][product_data][description]",
          selectedPlan.description,
        );
        bodyParams.append(
          "line_items[0][price_data][unit_amount]",
          selectedPlan.price.toString(),
        );
        if (isSubscription) {
          bodyParams.append("line_items[0][price_data][recurring][interval]", "month");
        }
        bodyParams.append("line_items[0][quantity]", "1");

        const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${stripeKey.trim()}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: bodyParams.toString(),
        });

        if (!stripeRes.ok) {
          const errData = await stripeRes.json().catch(() => ({}));
          console.error("Stripe Checkout Error:", errData);
          return { ok: false, error: "Payment processor returned an error. Please try again." };
        }

        const stripeSession = (await stripeRes.json()) as { id: string; url: string };

        // Record pending order
        await context.supabase.from("orders").insert({
          user_id: context.userId,
          stripe_session_id: stripeSession.id,
          plan: data.planId,
          amount: selectedPlan.price,
          currency: "usd",
          status: "pending",
        });

        return { ok: true, url: stripeSession.url, mode: "stripe" };
      } catch (err) {
        console.error("Failed to connect to Stripe:", err);
        return { ok: false, error: "Payment connection error. Please try again." };
      }
    }

    // 2. Fallback / Test Sandbox Mode (when awaiting payment provider merchant account review)
    // Directly provision the test plan for developer / reviewer preview
    const { data: order } = await context.supabase
      .from("orders")
      .insert({
        user_id: context.userId,
        plan: data.planId,
        amount: selectedPlan.price,
        currency: "usd",
        status: "succeeded",
      })
      .select("id")
      .single();

    // Update user credits
    if (data.planId === "launch") {
      const { data: existing } = await context.supabase
        .from("user_credits")
        .select("scan_credits")
        .eq("user_id", context.userId)
        .maybeSingle();

      const newCredits = (existing?.scan_credits ?? 1) + 5;
      await context.supabase.from("user_credits").upsert({
        user_id: context.userId,
        plan: "launch",
        scan_credits: newCredits,
        unlimited_scans: false,
        updated_at: new Date().toISOString(),
      });
    } else if (data.planId === "retest") {
      await context.supabase.from("user_credits").upsert({
        user_id: context.userId,
        plan: "retest",
        scan_credits: 999,
        unlimited_scans: true,
        updated_at: new Date().toISOString(),
      });

      await context.supabase.from("subscriptions").insert({
        user_id: context.userId,
        plan: "retest",
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        cancel_at_period_end: false,
      });
    }

    return {
      ok: true,
      url: `${successUrl}&orderId=${order?.id ?? "test"}&mode=sandbox`,
      mode: "test",
    };
  });
