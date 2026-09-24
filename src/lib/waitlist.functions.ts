import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

export const BUILDERS = ["Lovable", "Bolt", "Replit", "v0", "Cursor", "Other"] as const;

const signupSchema = z.object({
  email: z.string().trim().email().max(254),
  websiteUrl: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => /^https?:\/\/\S+\.\S+/i.test(value), "Enter a full URL starting with http"),
  builder: z.enum(BUILDERS),
  consentMarketing: z.boolean(),
  intent: z.enum(["waitlist", "preorder"]),
});

export type SignupInput = z.infer<typeof signupSchema>;

export type SignupResult = { ok: true } | { ok: false; error: string };

const RATE_LIMIT_PER_HOUR = 5;

async function hashClientKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const submitSignup = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signupSchema.parse(input))
  .handler(async ({ data }): Promise<SignupResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const forwardedFor = getRequestHeader("x-forwarded-for") ?? "";
    const clientIp =
      forwardedFor.split(",")[0]?.trim() ||
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-real-ip") ||
      new URL(getRequest().url).hostname;
    const ipHash = await hashClientKey(clientIp);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("waitlist")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneHourAgo);

    if (countError) {
      console.error("waitlist rate-limit check failed", countError);
      return { ok: false, error: "We could not save your details. Please try again shortly." };
    }

    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return { ok: false, error: "Too many submissions from this network. Try again in an hour." };
    }

    const { error } = await supabaseAdmin.from("waitlist").upsert(
      {
        email: data.email.toLowerCase(),
        website_url: data.websiteUrl,
        builder: data.builder,
        intent: data.intent,
        consent_marketing: data.consentMarketing,
        ip_hash: ipHash,
      },
      { onConflict: "email" },
    );

    if (error) {
      console.error("waitlist insert failed", error);
      return { ok: false, error: "We could not save your details. Please try again shortly." };
    }

    return { ok: true };
  });
