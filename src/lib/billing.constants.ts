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

export const SUPPORTED_PAYMENT_PROVIDERS = ["stripe", "paypal", "razorpay"] as const;
export type PaymentProvider = (typeof SUPPORTED_PAYMENT_PROVIDERS)[number];
