# PreLaunchQA — Audit + Build Plan

## 1. Audit (what I actually checked)

**Uploads received and read:**

- Logo (dark + light lockup, app icon)
- Brand sheet: Violet / Mint / Coral / Amber / Ink; Sora for headlines; Mint = passed, Coral = bug, Amber = needs review
- Build plan document (14 pages): gates G0–G3, MVP scope, agent list A1–A6, legal section, phases P0–P6, truth rules
- Demo video (1.5 MB MP4) — received, will be used as the landing page demo

**Current project state:** empty TanStack Start template. One page (placeholder index). No database, no auth, no payments. Nothing built yet.

**Honest constraints I must state before you approve:**

1. **Scan workers cannot run here.** The plan requires Playwright + Stagehand browser workers on Node.js. This app runs on an edge runtime with no Chromium, no persistent processes, no Redis/BullMQ. Real scanning needs a separate Node server (Fly.io / Railway / a VPS) that you own. I can build everything else here and define the exact worker contract, but I cannot run a browser scan inside this app.
2. **Payments:** Dodo is not a built-in integration. Stripe is. Payment provider approval is a Phase 0 item per your own plan.
3. **Legal text** (Terms, Privacy, DPDP notice) — I will scaffold structure only, with placeholders marked clearly. A lawyer fills the text. I will not invent legal language.
4. **Truth rules adopted:** no fake metrics, no testimonials, no customer logos, no counters, no "verified/certified/secure/bug-free" claims. Empty states when there is no real data.

## 2. Your infrastructure — what I saw and what to do with it

From your screenshots: GitHub account, a Supabase org (project `nextora-prod`), AWS Lightsail (ap-south-1), GoDaddy domain `prelaunchqa.com` (currently parked, GoDaddy nameservers).

| You have                  | Use it for                            | Action needed                                                                                                                                                                                                              |
| ------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub                    | Code backup + the scan-worker repo    | Connect this project to GitHub from the Lovable top bar                                                                                                                                                                    |
| Supabase                  | Database, auth, storage               | Do NOT reuse `nextora-prod`. Either enable Lovable Cloud (fresh managed database, zero setup — my recommendation) or create a separate `prelaunchqa-prod` Supabase project and connect it in Project Settings → Connectors |
| AWS Lightsail             | The Playwright scan workers (Phase 2) | Nothing yet. At Phase 2: 2 GB RAM Ubuntu instance, ap-south-1, Node LTS + Chromium deps                                                                                                                                    |
| GoDaddy `prelaunchqa.com` | Live site                             | Nothing yet. After Phase 0 is published I give you the exact DNS records to add                                                                                                                                            |

**Nothing else is needed to start Phase 0.** Payment keys are needed at Phase 4, the Lightsail server at Phase 2.

## 3. Phase plan (one phase per approval, each with proof)

### Phase 0 — Landing + waitlist + pre-order (gate G0)

- Brand system in code: Ink background, Violet/Mint/Coral/Amber tokens, Sora headlines
- Pages: `/` (hero, one-line promise, demo video, what v1 does / does not do, honest pricing), `/preorder`, `/terms`, `/privacy`
- Logo and demo video wired in from your uploads
- Backend (Lovable Cloud): `waitlist` table with RLS anon-insert-only, no public read; rate limit per IP; consent checkbox unticked by default
- Forbidden on this page: testimonials, customer logos, user counters, countdown timers
- **Proof:** build output, RLS state query result, HTTP status of every route

### Phase 1 — Accounts + targets + ownership verification (agent A1)

- Email auth, dashboard shell
- `targets` table: URL, verification token, status
- DNS TXT / meta-tag verification server function — real HTTP/DNS check, no simulation
- Scan blocked unless target is verified
- **Proof:** verification passing on a domain you control, failing on one you do not

### Phase 2 — Scan job pipeline + worker contract

- `scans` and `findings` tables, RLS scoped to owner
- Job creation, status lifecycle, Realtime progress in dashboard
- Public signed endpoint for the external worker to claim jobs and post results
- Worker repo skeleton (Node LTS + Playwright + Stagehand) generated as a downloadable package you deploy on your own server
- **Proof:** a real job flowing end to end from dashboard to worker and back

### Phase 3 — Report UI + evidence

- Findings grouped by severity from a rules table, not guessed
- Screenshots, video, trace, repro spec download, fix prompt per finding
- Findings with zero evidence are dropped
- Re-scan + before/after diff
- **Proof:** a real report rendered from real worker output

### Phase 4 — Billing

- Stripe: free sample scan, one-time launch check, monthly re-test plan
- Webhook signature verification; unsigned webhook rejected with 401
- **Proof:** real test-mode payment activating a plan

### Phase 5 — Launch support + status

Phase 6 (outreach with human approval gate) only after G2 passes.

At the end of every phase I give you: files changed, commands run with raw output, what is NOT done, and the exact steps for you to verify yourself.

## 4. Technical notes

- Stack: TanStack Start + Lovable Cloud (Postgres, auth, storage, RLS). Cloud is enabled in Phase 0.
- Scan workers stay external on Node LTS, communicating over a signed public API route.
- Large evidence files go to Cloud storage rather than the database.
- Severity rules live in a single source file, not scattered in components.

## 5. Approve to start

Approving starts **Phase 0 only**. I stop at the end of it and report before touching Phase 1.
