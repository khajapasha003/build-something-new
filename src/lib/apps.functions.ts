import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const BUILT_WITH = [
  "Next.js",
  "React",
  "Bolt",
  "Cursor",
  "v0",
  "Hand-coded",
  "Other",
] as const;

export const VERIFICATION_METHODS = ["dns", "meta", "file"] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export type AppRow = {
  id: string;
  url: string;
  origin: string;
  host: string;
  built_with: string | null;
  verification_status: "pending" | "verified" | "failed";
  verification_token: string;
  verified_at: string | null;
  created_at: string;
  managed_host: boolean;
};

const VERIFY_ATTEMPTS_PER_HOUR = 10;

function decorate(row: {
  id: string;
  url: string;
  origin: string;
  built_with: string | null;
  verification_status: string;
  verification_token: string;
  verified_at: string | null;
  created_at: string;
}): AppRow {
  const host = row.origin.replace(/^https:\/\//, "");
  return {
    ...row,
    host,
    verification_status: row.verification_status as AppRow["verification_status"],
    managed_host: MANAGED_SUFFIXES.some((s) => host.endsWith(s)),
  };
}

// Kept in sync with verification.server.ts (that module is server-only).
const MANAGED_SUFFIXES = [
  ".lovable.app",
  ".lovableproject.com",
  ".vercel.app",
  ".netlify.app",
  ".pages.dev",
  ".github.io",
  ".web.app",
  ".firebaseapp.com",
  ".replit.app",
  ".repl.co",
  ".onrender.com",
  ".fly.dev",
];

const SELECT_COLUMNS =
  "id, url, origin, built_with, verification_status, verification_token, verified_at, created_at";

export const listApps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AppRow[]> => {
    const { data, error } = await context.supabase
      .from("apps")
      .select(SELECT_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(decorate);
  });

const addAppSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  builtWith: z.enum(BUILT_WITH),
});

export type AddAppResult = { ok: true; app: AppRow } | { ok: false; error: string };

export const addApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => addAppSchema.parse(input))
  .handler(async ({ data, context }): Promise<AddAppResult> => {
    const { normalizeOrigin } = await import("./verification.server");
    const normalized = normalizeOrigin(data.url);
    if ("error" in normalized) return { ok: false, error: normalized.error };

    const { data: row, error } = await context.supabase
      .from("apps")
      .insert({
        user_id: context.userId,
        url: `${normalized.origin}/`,
        origin: normalized.origin,
        built_with: data.builtWith,
      })
      .select(SELECT_COLUMNS)
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "You have already added that address." };
      }
      console.error("addApp failed", error);
      return { ok: false, error: "We could not add that app. Please try again." };
    }
    return { ok: true, app: decorate(row) };
  });

export const deleteApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ appId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("apps").delete().eq("id", data.appId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export type VerifyResult = {
  ok: boolean;
  status: "verified" | "failed" | "pending";
  reason: string;
};

export const verifyApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ appId: z.string().uuid(), method: z.enum(VERIFICATION_METHODS) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<VerifyResult> => {
    const { data: app, error } = await context.supabase
      .from("apps")
      .select(SELECT_COLUMNS)
      .eq("id", data.appId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!app) return { ok: false, status: "pending", reason: "App not found." };

    const host = app.origin.replace(/^https:\/\//, "");
    const verification = await import("./verification.server");

    if (data.method === "dns" && verification.isManagedHost(host)) {
      return {
        ok: false,
        status: app.verification_status as VerifyResult["status"],
        reason:
          "DNS verification is not available on this hosting provider. Use the meta tag or file method.",
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("verification_attempts")
      .select("id", { count: "exact", head: true })
      .eq("app_id", app.id)
      .gte("created_at", oneHourAgo);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) >= VERIFY_ATTEMPTS_PER_HOUR) {
      return {
        ok: false,
        status: app.verification_status as VerifyResult["status"],
        reason: "Too many verification attempts for this app. Try again in an hour.",
      };
    }

    let outcome: { verified: boolean; reason: string };
    if (data.method === "dns") {
      outcome = await verification.verifyDns(host, app.verification_token);
    } else if (data.method === "meta") {
      outcome = await verification.verifyMeta(app.origin, app.verification_token);
    } else {
      outcome = await verification.verifyFile(app.origin, app.verification_token);
    }

    if (outcome.verified) {
      // Same origin may be verified by only one account at a time.
      const { error: updateError } = await supabaseAdmin
        .from("apps")
        .update({ verification_status: "verified", verified_at: new Date().toISOString() })
        .eq("id", app.id)
        .eq("user_id", context.userId);
      if (updateError) {
        if (updateError.code === "23505") {
          outcome = {
            verified: false,
            reason: "Another account has already verified this address.",
          };
        } else {
          throw new Error(updateError.message);
        }
      }
    }

    if (!outcome.verified && app.verification_status !== "verified") {
      await supabaseAdmin
        .from("apps")
        .update({ verification_status: "failed" })
        .eq("id", app.id)
        .eq("user_id", context.userId);
    }

    await supabaseAdmin.from("verification_attempts").insert({
      app_id: app.id,
      user_id: context.userId,
      method: data.method,
      result: outcome.verified ? "verified" : "failed",
      reason: outcome.reason.slice(0, 500),
    });

    return {
      ok: outcome.verified,
      status: outcome.verified ? "verified" : "failed",
      reason: outcome.reason,
    };
  });
