import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { TICKET_CATEGORIES, type TicketCategory } from "./support.constants";

export { TICKET_CATEGORIES, type TicketCategory };

const submitTicketSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address."),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters.").max(120),
  category: z.enum(TICKET_CATEGORIES),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(3000),
});

export type SubmitTicketResult =
  | { ok: true; ticketId: string; message: string }
  | { ok: false; error: string };

export const submitSupportTicket = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitTicketSchema.parse(input))
  .handler(async ({ data }): Promise<SubmitTicketResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Optional: check user from cookies / auth context if available
    let userId: string | null = null;
    try {
      const { createServerClient } = await import("@/integrations/supabase/client.server");
      // Best-effort check for session
    } catch {}

    const { data: ticket, error } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        email: data.email,
        subject: data.subject,
        category: data.category,
        message: data.message,
        user_id: userId,
        status: "open",
      })
      .select("id")
      .single();

    if (error) {
      console.error("submitSupportTicket error:", error);
      return { ok: false, error: "We could not submit your ticket. Please try again or email support@prelaunchqa.com" };
    }

    return {
      ok: true,
      ticketId: ticket.id,
      message: "Your ticket has been received. Our team typically replies within 24 hours.",
    };
  });

export type UserTicketRow = {
  id: string;
  subject: string;
  category: TicketCategory;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
};

export const listUserTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserTicketRow[]> => {
    const { data, error } = await context.supabase
      .from("support_tickets")
      .select("id, subject, category, status, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as UserTicketRow[];
  });
