import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { processSignup, type WaitlistDb } from "./waitlist.service.ts";

export const BUILDERS = ["Next.js", "React", "Bolt", "v0", "Cursor", "Other"] as const;

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

export const submitSignup = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signupSchema.parse(input))
  .handler(async ({ data }): Promise<SignupResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const db: WaitlistDb = {
      async countRecentByIpHash(ipHash, sinceIso) {
        const { count, error } = await supabaseAdmin
          .from("waitlist")
          .select("id", { count: "exact", head: true })
          .eq("ip_hash", ipHash)
          .gte("created_at", sinceIso);
        return { count, error };
      },
      async insert(record) {
        const { error } = await supabaseAdmin.from("waitlist").insert(record);
        return {
          error: error ? { code: error.code, message: error.message } : null,
        };
      },
    };

    let fallbackHostname = "";
    try {
      fallbackHostname = new URL(getRequest().url).hostname;
    } catch {
      // Ignored if getRequest() fails or has invalid URL
    }

    return processSignup(
      data,
      {
        cfConnectingIp: getRequestHeader("cf-connecting-ip"),
        xRealIp: getRequestHeader("x-real-ip"),
        xForwardedFor: getRequestHeader("x-forwarded-for"),
        fallbackHostname,
      },
      process.env["IP_HASH_KEY"],
      db,
    );
  });
