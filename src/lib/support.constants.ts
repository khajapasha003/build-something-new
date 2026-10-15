export const TICKET_CATEGORIES = [
  "general",
  "verification",
  "scan_issue",
  "billing",
  "feature_request",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
